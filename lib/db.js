import { mkdirSync, readFileSync } from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { randomUUID, scryptSync } from "node:crypto";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "app.db");
const seedPath = path.join(dataDir, "league.json");

mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA busy_timeout = 5000;");

let initialized = false;

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString("hex");
}

function getSeedData() {
  const raw = readFileSync(seedPath, "utf8");
  return JSON.parse(raw);
}

function seedPlayers(seed) {
  const insertPlayer = db.prepare(`
    INSERT INTO players (
      id, slug, name, style, bio, total_points, summary, captain, team_name, team_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  Object.values(seed.players).forEach((player) => {
    insertPlayer.run(
      player.id,
      player.slug,
      player.name,
      player.style,
      player.bio,
      player.totalPoints,
      player.summary,
      player.captain,
      player.teamName,
      JSON.stringify(player.team)
    );
  });
}

function seedUsers(seed) {
  const passwords = {
    nischal: process.env.NISCHAL_PASSWORD || "change-nischal-password",
    shreyas: process.env.SHREYAS_PASSWORD || "change-shreyas-password"
  };

  const insertUser = db.prepare(`
    INSERT INTO users (id, slug, name, password_hash, password_salt)
    VALUES (?, ?, ?, ?, ?)
  `);

  Object.values(seed.players).forEach((player) => {
    const salt = randomUUID();
    const password = passwords[player.slug] || `change-${player.slug}-password`;
    insertUser.run(player.id, player.slug, player.name, hashPassword(password, salt), salt);
  });
}

function syncUsersFromEnv() {
  const configuredPasswords = {
    nischal: process.env.NISCHAL_PASSWORD,
    shreyas: process.env.SHREYAS_PASSWORD
  };

  const existingUsers = db.prepare("SELECT slug, password_hash, password_salt FROM users").all();
  const updateUser = db.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE slug = ?");

  existingUsers.forEach((user) => {
    const configured = configuredPasswords[user.slug];
    if (!configured) {
      return;
    }

    const candidateHash = hashPassword(configured, user.password_salt);
    if (candidateHash === user.password_hash) {
      return;
    }

    const nextSalt = randomUUID();
    updateUser.run(hashPassword(configured, nextSalt), nextSalt, user.slug);
  });
}

function seedLeague(seed) {
  db.prepare(`
    INSERT INTO league_state (
      id, fixture, journal_date
    ) VALUES (1, ?, ?)
  `).run(
    seed.fixture,
    seed.journal.date
  );
}

function seedPosts(seed) {
  const insertPost = db.prepare(`
    INSERT INTO posts (
      id, slug, author_slug, title, date, result, summary, content, image_url, tags_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  seed.posts.forEach((post) => {
    insertPost.run(
      post.id,
      post.slug,
      post.authorSlug,
      post.title,
      post.date,
      post.result,
      post.summary,
      post.content,
      post.imageUrl || "",
      JSON.stringify(post.tags),
      post.date
    );
  });
}

function ensureDb() {
  if (initialized) {
    return;
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      style TEXT NOT NULL,
      bio TEXT NOT NULL,
      total_points INTEGER NOT NULL,
      summary TEXT NOT NULL,
      captain TEXT NOT NULL,
      team_name TEXT NOT NULL,
      team_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS league_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      fixture TEXT NOT NULL,
      journal_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      author_slug TEXT NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      result TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (author_slug) REFERENCES players(slug)
    );
  `);

  const postColumns = db.prepare("PRAGMA table_info(posts)").all();
  const hasImageUrl = postColumns.some((column) => column.name === "image_url");
  if (!hasImageUrl) {
    db.exec("ALTER TABLE posts ADD COLUMN image_url TEXT NOT NULL DEFAULT '';");
  }

  const leagueColumns = db.prepare("PRAGMA table_info(league_state)").all();
  const leagueColumnNames = leagueColumns.map((column) => column.name);
  const hasLegacyLeagueColumns = ["journal_match", "journal_headline", "journal_body", "hero_pick", "pain_point", "spicy_line"].some(
    (name) => leagueColumnNames.includes(name)
  );

  if (hasLegacyLeagueColumns) {
    db.exec(`
      CREATE TABLE league_state_next (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        fixture TEXT NOT NULL,
        journal_date TEXT NOT NULL
      );
    `);
    db.exec(`
      INSERT INTO league_state_next (id, fixture, journal_date)
      SELECT id, fixture, journal_date FROM league_state;
    `);
    db.exec("DROP TABLE league_state;");
    db.exec("ALTER TABLE league_state_next RENAME TO league_state;");
  }

  const existingPlayers = db.prepare("SELECT COUNT(*) as count FROM players").get().count;
  if (!existingPlayers) {
    const seed = getSeedData();
    seedPlayers(seed);
    seedUsers(seed);
    seedLeague(seed);
    seedPosts(seed);
  }

  initialized = true;
}

function getPlayersMap() {
  ensureDb();
  const rows = db.prepare("SELECT * FROM players ORDER BY slug").all();

  const map = {};
  rows.forEach((row) => {
    const key = row.slug === "nischal" ? "user" : row.slug === "shreyas" ? "friend" : row.slug;
    map[key] = {
      id: row.id,
      slug: row.slug,
      name: row.name,
      style: row.style,
      bio: row.bio,
      totalPoints: row.total_points,
      summary: row.summary,
      captain: row.captain,
      teamName: row.team_name,
      team: parseJson(row.team_json, [])
    };
  });

  return map;
}

function getPosts() {
  ensureDb();
  return db
    .prepare("SELECT * FROM posts ORDER BY date DESC, created_at DESC")
    .all()
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      authorSlug: row.author_slug,
      title: row.title,
      date: row.date,
      result: row.result,
      summary: row.summary,
      content: row.content,
      imageUrl: row.image_url,
      tags: parseJson(row.tags_json, [])
    }));
}

export function sortPosts(posts) {
  return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function getLeagueData() {
  ensureDb();
  const league = db.prepare("SELECT * FROM league_state WHERE id = 1").get();
  const players = getPlayersMap();
  const posts = getPosts();

  return {
    players,
    fixture: league.fixture,
    journal: {
      date: league.journal_date
    },
    posts,
    publishing: {
      owners: Object.values(players).map((player) => player.name),
      method: "Only signed-in owners can use the dashboard. Public visitors can read the posts but cannot create or edit anything."
    }
  };
}

export function getPlayerBySlug(slug) {
  const data = getLeagueData();
  return Object.values(data.players).find((player) => player.slug === slug) ?? null;
}

export function getPostBySlug(slug) {
  ensureDb();
  const row = db.prepare("SELECT * FROM posts WHERE slug = ?").get(slug);
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    authorSlug: row.author_slug,
    title: row.title,
    date: row.date,
    result: row.result,
    summary: row.summary,
    content: row.content,
    imageUrl: row.image_url,
    tags: parseJson(row.tags_json, [])
  };
}

export function getUserBySlug(slug) {
  ensureDb();
  return db.prepare("SELECT * FROM users WHERE slug = ?").get(slug) ?? null;
}

export function verifyUserPassword(slug, password) {
  const user = getUserBySlug(slug);
  if (!user) {
    return null;
  }

  const candidateHash = hashPassword(password, user.password_salt);
  if (candidateHash !== user.password_hash) {
    return null;
  }

  return {
    slug: user.slug,
    name: user.name
  };
}

export function addPost(post) {
  ensureDb();
  db.prepare(`
    INSERT INTO posts (id, slug, author_slug, title, date, result, summary, content, image_url, tags_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    post.id,
    post.slug,
    post.authorSlug,
    post.title,
    post.date,
    post.result,
    post.summary,
    post.content,
    post.imageUrl || "",
    JSON.stringify(post.tags),
    new Date().toISOString()
  );

  return post;
}

export function updatePost(postId, nextValues) {
  ensureDb();
  db.prepare(`
    UPDATE posts
    SET slug = ?, title = ?, date = ?, result = ?, summary = ?, content = ?, image_url = ?, tags_json = ?
    WHERE id = ?
  `).run(
    nextValues.slug,
    nextValues.title,
    nextValues.date,
    nextValues.result,
    nextValues.summary,
    nextValues.content,
    nextValues.imageUrl || "",
    JSON.stringify(nextValues.tags),
    postId
  );

  return db.prepare("SELECT slug, author_slug FROM posts WHERE id = ?").get(postId);
}

export function deletePost(postId) {
  ensureDb();
  const existing = db.prepare("SELECT slug, author_slug FROM posts WHERE id = ?").get(postId);
  if (!existing) {
    return null;
  }

  db.prepare("DELETE FROM posts WHERE id = ?").run(postId);
  return existing;
}

export function updateLeagueOverview(nextValues) {
  ensureDb();

  db.prepare(`
    UPDATE league_state
    SET fixture = ?, journal_date = ?
    WHERE id = 1
  `).run(
    nextValues.fixture,
    nextValues.journal.date
  );

  const updatePlayer = db.prepare(`
    UPDATE players
    SET name = ?, style = ?, bio = ?, total_points = ?, summary = ?, captain = ?, team_name = ?, team_json = ?
    WHERE slug = ?
  `);
  const updateUser = db.prepare("UPDATE users SET name = ? WHERE slug = ?");

  Object.values(nextValues.players).forEach((player) => {
    updatePlayer.run(
      player.name,
      player.style,
      player.bio,
      player.totalPoints,
      player.summary,
      player.captain,
      player.teamName,
      JSON.stringify(player.team),
      player.slug
    );
    updateUser.run(player.name, player.slug);
  });

  return getLeagueData();
}

export function getAuthors() {
  ensureDb();
  return db
    .prepare("SELECT slug, name FROM users ORDER BY name")
    .all()
    .map((row) => ({
      slug: row.slug,
      name: row.name
    }));
}
