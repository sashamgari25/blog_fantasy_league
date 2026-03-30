import { mkdirSync, readFileSync } from "fs";
import { createRequire } from "module";
import path from "path";
import { randomUUID, scryptSync } from "node:crypto";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

const require = createRequire(import.meta.url);
const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "app.db");
const seedPath = path.join(dataDir, "league.json");

let initialized = false;
let db = null;

function getLocalDb() {
  if (db) {
    return db;
  }

  mkdirSync(dataDir, { recursive: true });

  // Only load SQLite when we're actually using local storage.
  const { DatabaseSync } = require("node:sqlite");
  db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  return db;
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function parseMaybeJson(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === "object")) {
    return value;
  }

  return parseJson(value, fallback);
}

function mapSupabasePlayer(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    style: row.style,
    bio: row.bio,
    totalPoints: row.total_points,
    summary: row.summary,
    captain: row.captain,
    teamName: row.team_name,
    team: parseMaybeJson(row.team_json, [])
  };
}

function mapSupabasePost(row) {
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
    pinned: Boolean(row.pinned),
    likeCount: row.like_count ?? 0,
    tags: parseMaybeJson(row.tags_json, [])
  };
}

function mapSupabaseComment(row) {
  return {
    id: row.id,
    postSlug: row.post_slug,
    readerSlug: row.reader_slug,
    parentCommentId: row.parent_comment_id,
    authorUsername: row.author_username,
    authorRole: row.author_role || "guest",
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at
  };
}

function mapSupabaseNotification(row) {
  return {
    id: row.id,
    readerSlug: row.reader_slug,
    postSlug: row.post_slug,
    commentId: row.comment_id,
    actorName: row.actor_name,
    actorUsername: row.actor_username,
    type: row.type,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at
  };
}

function mapLocalComment(row) {
  return {
    id: row.id,
    postSlug: row.post_slug,
    readerSlug: row.reader_slug,
    parentCommentId: row.parent_comment_id,
    authorUsername: row.author_username,
    authorRole: row.author_role || "guest",
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at
  };
}

function mapLocalNotification(row) {
  return {
    id: row.id,
    readerSlug: row.reader_slug,
    postSlug: row.post_slug,
    commentId: row.comment_id,
    actorName: row.actor_name,
    actorUsername: row.actor_username,
    type: row.type,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at
  };
}

function mapLikeSummary(rows, key) {
  const counts = new Map();
  rows.forEach((row) => {
    counts.set(row[key], (counts.get(row[key]) || 0) + 1);
  });
  return counts;
}

function buildCommentSubtreeIds(comments, rootId) {
  const childMap = new Map();

  comments.forEach((comment) => {
    const parentId = comment.parent_comment_id || null;
    if (!childMap.has(parentId)) {
      childMap.set(parentId, []);
    }
    childMap.get(parentId).push(comment.id);
  });

  const ids = [];
  const stack = [rootId];

  while (stack.length) {
    const current = stack.pop();
    ids.push(current);
    const children = childMap.get(current) || [];
    children.forEach((childId) => stack.push(childId));
  }

  return ids;
}

async function getLeagueDataFromSupabase() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const [{ data: playersRows, error: playersError }, { data: postsRows, error: postsError }, { data: likeRows, error: likeError }, { data: leagueRow, error: leagueError }] =
    await Promise.all([
      supabase.from("players").select("*").order("slug"),
      supabase.from("posts").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("post_likes").select("post_slug"),
      supabase.from("league_state").select("*").eq("id", 1).single()
    ]);

  if (playersError) throw playersError;
  if (postsError) throw postsError;
  if (likeError) throw likeError;
  if (leagueError) throw leagueError;

  const players = {};
  playersRows.forEach((row) => {
    const mapped = mapSupabasePlayer(row);
    const key = mapped.slug === "nischal" ? "user" : mapped.slug === "shreyas" ? "friend" : mapped.slug;
    players[key] = mapped;
  });

  const likeCounts = mapLikeSummary(likeRows || [], "post_slug");

  return {
    players,
    fixture: leagueRow.fixture,
    journal: {
      date: leagueRow.journal_date
    },
    posts: postsRows.map((row) => ({
      ...mapSupabasePost(row),
      likeCount: likeCounts.get(row.slug) || 0
    })),
    publishing: {
      owners: Object.values(players).map((player) => player.name),
      method: "Only signed-in owners can use the dashboard. Public visitors can read the posts but cannot create or edit anything."
    }
  };
}

function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString("hex");
}

function getSeedData() {
  const raw = readFileSync(seedPath, "utf8");
  return JSON.parse(raw);
}

function seedPlayers(seed) {
  const db = getLocalDb();
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
  const db = getLocalDb();
  const passwords = {
    nischal: process.env.NISCHAL_PASSWORD || "change-nischal-password",
    shreyas: process.env.SHREYAS_PASSWORD || "change-shreyas-password"
  };

  const insertUser = db.prepare(`
    INSERT INTO users (id, slug, name, username, email, role, password_hash, password_salt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  Object.values(seed.players).forEach((player) => {
    const salt = randomUUID();
    const password = passwords[player.slug] || `change-${player.slug}-password`;
    insertUser.run(player.id, player.slug, player.name, null, null, "author", hashPassword(password, salt), salt);
  });
}

function syncUsersFromEnv() {
  const db = getLocalDb();
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
  const db = getLocalDb();
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
  const db = getLocalDb();
  const insertPost = db.prepare(`
    INSERT INTO posts (
      id, slug, author_slug, title, date, result, summary, content, image_url, tags_json, created_at
      , pinned
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      post.date,
      post.pinned ? 1 : 0
    );
  });
}

function ensureDb() {
  if (initialized) {
    return;
  }

  const db = getLocalDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      username TEXT UNIQUE,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'author',
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
      pinned INTEGER NOT NULL DEFAULT 0,
      tags_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (author_slug) REFERENCES players(slug)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_slug TEXT NOT NULL,
      reader_slug TEXT,
      parent_comment_id TEXT,
      author_username TEXT,
      author_role TEXT NOT NULL DEFAULT 'guest',
      author_name TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_slug) REFERENCES posts(slug) ON DELETE CASCADE,
      FOREIGN KEY (reader_slug) REFERENCES users(slug) ON DELETE SET NULL,
      FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS post_likes (
      post_slug TEXT NOT NULL,
      user_slug TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (post_slug, user_slug),
      FOREIGN KEY (post_slug) REFERENCES posts(slug) ON DELETE CASCADE,
      FOREIGN KEY (user_slug) REFERENCES users(slug) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comment_likes (
      comment_id TEXT NOT NULL,
      user_slug TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (comment_id, user_slug),
      FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
      FOREIGN KEY (user_slug) REFERENCES users(slug) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      reader_slug TEXT NOT NULL,
      post_slug TEXT NOT NULL,
      comment_id TEXT,
      actor_name TEXT NOT NULL,
      actor_username TEXT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      read_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (reader_slug) REFERENCES users(slug) ON DELETE CASCADE,
      FOREIGN KEY (post_slug) REFERENCES posts(slug) ON DELETE CASCADE,
      FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
    );
  `);

  const userColumns = db.prepare("PRAGMA table_info(users)").all();
  const userColumnNames = userColumns.map((column) => column.name);
  if (!userColumnNames.includes("username")) {
    db.exec("ALTER TABLE users ADD COLUMN username TEXT;");
  }
  if (!userColumnNames.includes("email")) {
    db.exec("ALTER TABLE users ADD COLUMN email TEXT;");
  }
  if (!userColumnNames.includes("role")) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'author';");
  }
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users(username);");

  const commentColumns = db.prepare("PRAGMA table_info(comments)").all();
  const commentColumnNames = commentColumns.map((column) => column.name);
  if (!commentColumnNames.includes("parent_comment_id")) {
    db.exec("ALTER TABLE comments ADD COLUMN parent_comment_id TEXT;");
  }
  if (!commentColumnNames.includes("author_username")) {
    db.exec("ALTER TABLE comments ADD COLUMN author_username TEXT;");
  }
  if (!commentColumnNames.includes("author_role")) {
    db.exec("ALTER TABLE comments ADD COLUMN author_role TEXT NOT NULL DEFAULT 'guest';");
  }
  db.exec("CREATE INDEX IF NOT EXISTS comments_post_created_idx ON comments(post_slug, created_at);");

  const postColumns = db.prepare("PRAGMA table_info(posts)").all();
  const postColumnNames = postColumns.map((column) => column.name);
  if (!postColumnNames.includes("pinned")) {
    db.exec("ALTER TABLE posts ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;");
  }
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS posts_one_pinned_per_author_idx ON posts(author_slug) WHERE pinned = 1;");
  db.exec("CREATE INDEX IF NOT EXISTS comments_parent_idx ON comments(parent_comment_id);");
  db.exec("CREATE INDEX IF NOT EXISTS post_likes_post_slug_idx ON post_likes(post_slug);");
  db.exec("CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON comment_likes(comment_id);");

  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      reader_slug TEXT NOT NULL,
      post_slug TEXT NOT NULL,
      comment_id TEXT,
      actor_name TEXT NOT NULL,
      actor_username TEXT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      read_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (reader_slug) REFERENCES users(slug) ON DELETE CASCADE,
      FOREIGN KEY (post_slug) REFERENCES posts(slug) ON DELETE CASCADE,
      FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
    );
  `);
  db.exec("CREATE INDEX IF NOT EXISTS notifications_reader_created_idx ON notifications(reader_slug, created_at);");

  const postColumnsWithImage = db.prepare("PRAGMA table_info(posts)").all();
  const hasImageUrl = postColumnsWithImage.some((column) => column.name === "image_url");
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

  syncUsersFromEnv();

  initialized = true;
}

function getPlayersMap() {
  const db = getLocalDb();
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
  const db = getLocalDb();
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
      pinned: Boolean(row.pinned),
      likeCount: db.prepare("SELECT COUNT(*) as count FROM post_likes WHERE post_slug = ?").get(row.slug)?.count || 0,
      tags: parseJson(row.tags_json, [])
    }));
}

export function sortPosts(posts) {
  return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function getLeagueData() {
  if (isSupabaseConfigured()) {
    return getLeagueDataFromSupabase();
  }

  const db = getLocalDb();
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

export async function getPlayerBySlug(slug) {
  const data = await getLeagueData();
  return Object.values(data.players).find((player) => player.slug === slug) ?? null;
}

export async function getPostBySlug(slug) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("posts").select("*").eq("slug", slug).single();
    if (error) {
      return null;
    }

    return mapSupabasePost(data);
  }

  const db = getLocalDb();
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
    pinned: Boolean(row.pinned),
    likeCount: 0,
    tags: parseJson(row.tags_json, [])
  };
}

export async function getUserBySlug(slug) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("users").select("*").eq("slug", slug).single();
    if (error) {
      return null;
    }

    return data;
  }

  const db = getLocalDb();
  ensureDb();
  return db.prepare("SELECT * FROM users WHERE slug = ?").get(slug) ?? null;
}

export async function getReaderByUsername(username) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("users").select("*").eq("username", username).eq("role", "reader").single();
    if (error) {
      return null;
    }

    return data;
  }

  const db = getLocalDb();
  ensureDb();
  return db.prepare("SELECT * FROM users WHERE username = ? AND role = 'reader'").get(username) ?? null;
}

export async function getUsersByUsernames(usernames) {
  if (!usernames.length) {
    return [];
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const [{ data: byUsername, error: usernameError }, { data: bySlug, error: slugError }] = await Promise.all([
      supabase.from("users").select("*").in("username", usernames),
      supabase.from("users").select("*").in("slug", usernames)
    ]);
    if (usernameError) throw usernameError;
    if (slugError) throw slugError;
    const merged = [...(byUsername || []), ...(bySlug || [])];
    return Array.from(new Map(merged.map((user) => [user.slug, user])).values());
  }

  const db = getLocalDb();
  ensureDb();
  const placeholders = usernames.map(() => "?").join(", ");
  return db
    .prepare(`SELECT * FROM users WHERE username IN (${placeholders}) OR slug IN (${placeholders})`)
    .all(...usernames, ...usernames);
}

export async function verifyUserPassword(slug, password) {
  const user = await getUserBySlug(slug);
  if (!user) {
    return null;
  }

  const candidateHash = hashPassword(password, user.password_salt);
  if (candidateHash !== user.password_hash) {
    return null;
  }

  return {
    slug: user.slug,
    name: user.name,
    role: user.role || "author",
    username: user.username || user.slug
  };
}

export async function verifyReaderPassword(username, password) {
  const reader = await getReaderByUsername(username);
  if (!reader) {
    return null;
  }

  const candidateHash = hashPassword(password, reader.password_salt);
  if (candidateHash !== reader.password_hash) {
    return null;
  }

  return {
    slug: reader.slug,
    name: reader.name,
    role: "reader",
    username: reader.username
  };
}

export async function createReaderAccount({ username, name, email, password }) {
  const normalizedUsername = username.toLowerCase();
  const existing = await getReaderByUsername(normalizedUsername);
  if (existing) {
    throw new Error("That username is already taken.");
  }

  const id = `reader-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const slug = `reader-${normalizedUsername}`;
  const salt = randomUUID();
  const passwordHash = hashPassword(password, salt);

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("users").insert({
      id,
      slug,
      name,
      username: normalizedUsername,
      email: email || null,
      role: "reader",
      password_hash: passwordHash,
      password_salt: salt
    });

    if (error) throw error;
  } else {
    const db = getLocalDb();
    ensureDb();
    db.prepare(`
      INSERT INTO users (id, slug, name, username, email, role, password_hash, password_salt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, slug, name, normalizedUsername, email || null, "reader", passwordHash, salt);
  }

  return {
    slug,
    name,
    role: "reader",
    username: normalizedUsername
  };
}

export async function addPost(post) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("posts").insert({
      id: post.id,
      slug: post.slug,
      author_slug: post.authorSlug,
      title: post.title,
      date: post.date,
      result: post.result,
      summary: post.summary,
      content: post.content,
      image_url: post.imageUrl || "",
      pinned: post.pinned ? 1 : 0,
      tags_json: post.tags,
      created_at: new Date().toISOString()
    });

    if (error) throw error;
    return post;
  }

  const db = getLocalDb();
  ensureDb();
  db.prepare(`
    INSERT INTO posts (id, slug, author_slug, title, date, result, summary, content, image_url, pinned, tags_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    post.pinned ? 1 : 0,
    JSON.stringify(post.tags),
    new Date().toISOString()
  );

  return post;
}

export async function updatePost(postId, nextValues) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from("posts")
      .select("slug, author_slug")
      .eq("id", postId)
      .single();

    if (existingError) throw existingError;

    if (nextValues.pinned) {
      const { error: unpinError } = await supabase
        .from("posts")
        .update({ pinned: 0 })
        .eq("author_slug", existing.author_slug)
        .neq("id", postId);
      if (unpinError) throw unpinError;
    }

    const { error } = await supabase
      .from("posts")
      .update({
        slug: nextValues.slug,
        title: nextValues.title,
        date: nextValues.date,
        result: nextValues.result,
        summary: nextValues.summary,
        content: nextValues.content,
        image_url: nextValues.imageUrl || "",
        pinned: nextValues.pinned ? 1 : 0,
        tags_json: nextValues.tags
      })
      .eq("id", postId);

    if (error) throw error;
    return { slug: nextValues.slug, author_slug: existing.author_slug };
  }

  const db = getLocalDb();
  ensureDb();
  const existing = db.prepare("SELECT slug, author_slug FROM posts WHERE id = ?").get(postId);
  if (nextValues.pinned && existing) {
    db.prepare("UPDATE posts SET pinned = 0 WHERE author_slug = ? AND id != ?").run(existing.author_slug, postId);
  }
  db.prepare(`
    UPDATE posts
    SET slug = ?, title = ?, date = ?, result = ?, summary = ?, content = ?, image_url = ?, pinned = ?, tags_json = ?
    WHERE id = ?
  `).run(
    nextValues.slug,
    nextValues.title,
    nextValues.date,
    nextValues.result,
    nextValues.summary,
    nextValues.content,
    nextValues.imageUrl || "",
    nextValues.pinned ? 1 : 0,
    JSON.stringify(nextValues.tags),
    postId
  );

  return existing || db.prepare("SELECT slug, author_slug FROM posts WHERE id = ?").get(postId);
}

export async function deletePost(postId) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from("posts")
      .select("slug, author_slug")
      .eq("id", postId)
      .single();
    if (existingError) {
      return null;
    }

    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) throw error;
    return existing;
  }

  const db = getLocalDb();
  ensureDb();
  const existing = db.prepare("SELECT slug, author_slug FROM posts WHERE id = ?").get(postId);
  if (!existing) {
    return null;
  }

  db.prepare("DELETE FROM posts WHERE id = ?").run(postId);
  return existing;
}

export async function updateLeagueOverview(nextValues) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();

    const { error: leagueError } = await supabase
      .from("league_state")
      .update({
        fixture: nextValues.fixture,
        journal_date: nextValues.journal.date
      })
      .eq("id", 1);
    if (leagueError) throw leagueError;

    for (const player of Object.values(nextValues.players)) {
      const { error } = await supabase
        .from("players")
        .update({
          name: player.name,
          style: player.style,
          bio: player.bio,
          total_points: player.totalPoints,
          summary: player.summary,
          captain: player.captain,
          team_name: player.teamName,
          team_json: player.team
        })
        .eq("slug", player.slug);
      if (error) throw error;

      const { error: userError } = await supabase.from("users").update({ name: player.name }).eq("slug", player.slug);
      if (userError) throw userError;
    }

    return getLeagueData();
  }

  const db = getLocalDb();
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

export async function getAuthors() {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("users").select("slug, name").eq("role", "author").order("name");
    if (error) throw error;
    return data.map((row) => ({ slug: row.slug, name: row.name }));
  }

  const db = getLocalDb();
  ensureDb();
  return db
    .prepare("SELECT slug, name FROM users WHERE role = 'author' ORDER BY name")
    .all()
    .map((row) => ({
      slug: row.slug,
      name: row.name
    }));
}

export async function getCommentsByPostSlug(postSlug) {
  return getCommentsByPostSlugForUser(postSlug, null);
}

export async function getCommentsByPostSlugForUser(postSlug, viewerSlug) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_slug", postSlug)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const comments = data.map(mapSupabaseComment);
    if (!comments.length) {
      return comments;
    }

    const ids = comments.map((comment) => comment.id);
    const [{ data: likesRows, error: likesError }, { data: viewerLikes, error: viewerLikesError }] = await Promise.all([
      supabase.from("comment_likes").select("comment_id").in("comment_id", ids),
      viewerSlug ? supabase.from("comment_likes").select("comment_id").in("comment_id", ids).eq("user_slug", viewerSlug) : Promise.resolve({ data: [], error: null })
    ]);
    if (likesError) throw likesError;
    if (viewerLikesError) throw viewerLikesError;

    const counts = mapLikeSummary(likesRows || [], "comment_id");
    const likedSet = new Set((viewerLikes || []).map((row) => row.comment_id));

    return comments.map((comment) => ({
      ...comment,
      likeCount: counts.get(comment.id) || 0,
      likedByViewer: likedSet.has(comment.id)
    }));
  }

  const db = getLocalDb();
  ensureDb();
  const comments = db.prepare("SELECT * FROM comments WHERE post_slug = ? ORDER BY created_at ASC").all(postSlug).map(mapLocalComment);
  if (!comments.length) {
    return comments;
  }

  const ids = comments.map((comment) => comment.id);
  const placeholders = ids.map(() => "?").join(", ");
  const likeRows = db.prepare(`SELECT comment_id FROM comment_likes WHERE comment_id IN (${placeholders})`).all(...ids);
  const viewerRows =
    viewerSlug && ids.length
      ? db.prepare(`SELECT comment_id FROM comment_likes WHERE user_slug = ? AND comment_id IN (${placeholders})`).all(viewerSlug, ...ids)
      : [];
  const counts = mapLikeSummary(likeRows, "comment_id");
  const likedSet = new Set(viewerRows.map((row) => row.comment_id));

  return comments.map((comment) => ({
    ...comment,
    likeCount: counts.get(comment.id) || 0,
    likedByViewer: likedSet.has(comment.id)
  }));
}

export async function addComment(comment) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("comments").insert({
      id: comment.id,
      post_slug: comment.postSlug,
      reader_slug: comment.readerSlug || null,
      parent_comment_id: comment.parentCommentId || null,
      author_username: comment.authorUsername || null,
      author_role: comment.authorRole || "guest",
      author_name: comment.authorName,
      body: comment.body,
      created_at: comment.createdAt
    });
    if (error) throw error;
    return comment;
  }

  const db = getLocalDb();
  ensureDb();
  db.prepare(`
    INSERT INTO comments (id, post_slug, reader_slug, parent_comment_id, author_username, author_role, author_name, body, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    comment.id,
    comment.postSlug,
    comment.readerSlug || null,
    comment.parentCommentId || null,
    comment.authorUsername || null,
    comment.authorRole || "guest",
    comment.authorName,
    comment.body,
    comment.createdAt
  );
  return comment;
}

export async function getCommentById(commentId) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("comments").select("*").eq("id", commentId).single();
    if (error) {
      return null;
    }
    return mapSupabaseComment(data);
  }

  const db = getLocalDb();
  ensureDb();
  const row = db.prepare("SELECT * FROM comments WHERE id = ?").get(commentId);
  if (!row) {
    return null;
  }
  return mapLocalComment(row);
}

export async function deleteComment(commentId) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase.from("comments").select("*").eq("id", commentId).single();
    if (existingError) {
      return null;
    }

    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) throw error;
    return mapSupabaseComment(existing);
  }

  const db = getLocalDb();
  ensureDb();
  const existing = db.prepare("SELECT * FROM comments WHERE id = ?").get(commentId);
  if (!existing) {
    return null;
  }

  const commentRows = db.prepare("SELECT id, parent_comment_id FROM comments WHERE post_slug = ?").all(existing.post_slug);
  const subtreeIds = buildCommentSubtreeIds(commentRows, commentId);
  const placeholders = subtreeIds.map(() => "?").join(", ");

  db.prepare(`DELETE FROM notifications WHERE comment_id IN (${placeholders})`).run(...subtreeIds);
  db.prepare(`DELETE FROM comments WHERE id IN (${placeholders})`).run(...subtreeIds);

  return mapLocalComment(existing);
}

export async function addNotifications(notifications) {
  if (!notifications.length) {
    return [];
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("notifications").insert(
      notifications.map((notification) => ({
        id: notification.id,
        reader_slug: notification.readerSlug,
        post_slug: notification.postSlug,
        comment_id: notification.commentId || null,
        actor_name: notification.actorName,
        actor_username: notification.actorUsername || null,
        type: notification.type,
        message: notification.message,
        read_at: notification.readAt || null,
        created_at: notification.createdAt
      }))
    );
    if (error) throw error;
    return notifications;
  }

  const db = getLocalDb();
  ensureDb();
  const statement = db.prepare(`
    INSERT INTO notifications (id, reader_slug, post_slug, comment_id, actor_name, actor_username, type, message, read_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  notifications.forEach((notification) => {
    statement.run(
      notification.id,
      notification.readerSlug,
      notification.postSlug,
      notification.commentId || null,
      notification.actorName,
      notification.actorUsername || null,
      notification.type,
      notification.message,
      notification.readAt || null,
      notification.createdAt
    );
  });
  return notifications;
}

export async function getPostLikeState(postSlug, viewerSlug) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const [{ count, error: countError }, { data: viewerRows, error: viewerError }] = await Promise.all([
      supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_slug", postSlug),
      viewerSlug ? supabase.from("post_likes").select("post_slug").eq("post_slug", postSlug).eq("user_slug", viewerSlug) : Promise.resolve({ data: [], error: null })
    ]);
    if (countError) throw countError;
    if (viewerError) throw viewerError;
    return {
      likeCount: count || 0,
      likedByViewer: Boolean(viewerRows?.length)
    };
  }

  const db = getLocalDb();
  ensureDb();
  const countRow = db.prepare("SELECT COUNT(*) as count FROM post_likes WHERE post_slug = ?").get(postSlug);
  const likedRow = viewerSlug ? db.prepare("SELECT 1 FROM post_likes WHERE post_slug = ? AND user_slug = ?").get(postSlug, viewerSlug) : null;
  return {
    likeCount: countRow?.count || 0,
    likedByViewer: Boolean(likedRow)
  };
}

export async function togglePostLike(postSlug, userSlug) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from("post_likes")
      .select("post_slug")
      .eq("post_slug", postSlug)
      .eq("user_slug", userSlug)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing) {
      const { error } = await supabase.from("post_likes").delete().eq("post_slug", postSlug).eq("user_slug", userSlug);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("post_likes").insert({ post_slug: postSlug, user_slug: userSlug, created_at: new Date().toISOString() });
      if (error) throw error;
    }

    return getPostLikeState(postSlug, userSlug);
  }

  const db = getLocalDb();
  ensureDb();
  const existing = db.prepare("SELECT 1 FROM post_likes WHERE post_slug = ? AND user_slug = ?").get(postSlug, userSlug);
  if (existing) {
    db.prepare("DELETE FROM post_likes WHERE post_slug = ? AND user_slug = ?").run(postSlug, userSlug);
  } else {
    db.prepare("INSERT INTO post_likes (post_slug, user_slug, created_at) VALUES (?, ?, ?)").run(postSlug, userSlug, new Date().toISOString());
  }
  return getPostLikeState(postSlug, userSlug);
}

export async function setPostLike(postSlug, userSlug, shouldLike) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from("post_likes")
      .select("post_slug")
      .eq("post_slug", postSlug)
      .eq("user_slug", userSlug)
      .maybeSingle();
    if (existingError) throw existingError;

    if (shouldLike && !existing) {
      const { error } = await supabase.from("post_likes").insert({ post_slug: postSlug, user_slug: userSlug, created_at: new Date().toISOString() });
      if (error) throw error;
    }

    if (!shouldLike && existing) {
      const { error } = await supabase.from("post_likes").delete().eq("post_slug", postSlug).eq("user_slug", userSlug);
      if (error) throw error;
    }

    return getPostLikeState(postSlug, userSlug);
  }

  const db = getLocalDb();
  ensureDb();
  const existing = db.prepare("SELECT 1 FROM post_likes WHERE post_slug = ? AND user_slug = ?").get(postSlug, userSlug);

  if (shouldLike && !existing) {
    db.prepare("INSERT INTO post_likes (post_slug, user_slug, created_at) VALUES (?, ?, ?)").run(postSlug, userSlug, new Date().toISOString());
  }

  if (!shouldLike && existing) {
    db.prepare("DELETE FROM post_likes WHERE post_slug = ? AND user_slug = ?").run(postSlug, userSlug);
  }

  return getPostLikeState(postSlug, userSlug);
}

export async function toggleCommentLike(commentId, userSlug) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from("comment_likes")
      .select("comment_id")
      .eq("comment_id", commentId)
      .eq("user_slug", userSlug)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing) {
      const { error } = await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_slug", userSlug);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("comment_likes").insert({ comment_id: commentId, user_slug: userSlug, created_at: new Date().toISOString() });
      if (error) throw error;
    }

    const [{ count, error: countError }, { data: viewerRows, error: viewerError }] = await Promise.all([
      supabase.from("comment_likes").select("*", { count: "exact", head: true }).eq("comment_id", commentId),
      supabase.from("comment_likes").select("comment_id").eq("comment_id", commentId).eq("user_slug", userSlug)
    ]);
    if (countError) throw countError;
    if (viewerError) throw viewerError;
    return {
      likeCount: count || 0,
      likedByViewer: Boolean(viewerRows?.length)
    };
  }

  const db = getLocalDb();
  ensureDb();
  const existing = db.prepare("SELECT 1 FROM comment_likes WHERE comment_id = ? AND user_slug = ?").get(commentId, userSlug);
  if (existing) {
    db.prepare("DELETE FROM comment_likes WHERE comment_id = ? AND user_slug = ?").run(commentId, userSlug);
  } else {
    db.prepare("INSERT INTO comment_likes (comment_id, user_slug, created_at) VALUES (?, ?, ?)").run(commentId, userSlug, new Date().toISOString());
  }

  const countRow = db.prepare("SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = ?").get(commentId);
  const likedRow = db.prepare("SELECT 1 FROM comment_likes WHERE comment_id = ? AND user_slug = ?").get(commentId, userSlug);
  return {
    likeCount: countRow?.count || 0,
    likedByViewer: Boolean(likedRow)
  };
}

export async function setCommentLike(commentId, userSlug, shouldLike) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from("comment_likes")
      .select("comment_id")
      .eq("comment_id", commentId)
      .eq("user_slug", userSlug)
      .maybeSingle();
    if (existingError) throw existingError;

    if (shouldLike && !existing) {
      const { error } = await supabase.from("comment_likes").insert({ comment_id: commentId, user_slug: userSlug, created_at: new Date().toISOString() });
      if (error) throw error;
    }

    if (!shouldLike && existing) {
      const { error } = await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_slug", userSlug);
      if (error) throw error;
    }

    const [{ count, error: countError }, { data: viewerRows, error: viewerError }] = await Promise.all([
      supabase.from("comment_likes").select("*", { count: "exact", head: true }).eq("comment_id", commentId),
      supabase.from("comment_likes").select("comment_id").eq("comment_id", commentId).eq("user_slug", userSlug)
    ]);
    if (countError) throw countError;
    if (viewerError) throw viewerError;
    return {
      likeCount: count || 0,
      likedByViewer: Boolean(viewerRows?.length)
    };
  }

  const db = getLocalDb();
  ensureDb();
  const existing = db.prepare("SELECT 1 FROM comment_likes WHERE comment_id = ? AND user_slug = ?").get(commentId, userSlug);

  if (shouldLike && !existing) {
    db.prepare("INSERT INTO comment_likes (comment_id, user_slug, created_at) VALUES (?, ?, ?)").run(commentId, userSlug, new Date().toISOString());
  }

  if (!shouldLike && existing) {
    db.prepare("DELETE FROM comment_likes WHERE comment_id = ? AND user_slug = ?").run(commentId, userSlug);
  }

  const countRow = db.prepare("SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = ?").get(commentId);
  const likedRow = db.prepare("SELECT 1 FROM comment_likes WHERE comment_id = ? AND user_slug = ?").get(commentId, userSlug);
  return {
    likeCount: countRow?.count || 0,
    likedByViewer: Boolean(likedRow)
  };
}

export async function getAllCommentActivity() {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const [{ data: comments, error: commentsError }, { data: posts, error: postsError }] = await Promise.all([
      supabase.from("comments").select("*").order("created_at", { ascending: false }),
      supabase.from("posts").select("slug, title")
    ]);
    if (commentsError) throw commentsError;
    if (postsError) throw postsError;

    const postTitles = new Map((posts || []).map((post) => [post.slug, post.title]));
    return (comments || []).map((comment) => ({
      ...mapSupabaseComment(comment),
      postTitle: postTitles.get(comment.post_slug) || null
    }));
  }

  const db = getLocalDb();
  ensureDb();
  return db
    .prepare(`
      SELECT comments.*, posts.title AS post_title
      FROM comments
      LEFT JOIN posts ON posts.slug = comments.post_slug
      ORDER BY comments.created_at DESC
    `)
    .all()
    .map((row) => ({
      ...mapLocalComment(row),
      postTitle: row.post_title || null
    }));
}

export async function getInboxNotifications(readerSlug) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("reader_slug", readerSlug)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data.map(mapSupabaseNotification);
  }

  const db = getLocalDb();
  ensureDb();
  return db.prepare("SELECT * FROM notifications WHERE reader_slug = ? ORDER BY created_at DESC").all(readerSlug).map(mapLocalNotification);
}

export async function getUnreadNotificationCount(readerSlug) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("reader_slug", readerSlug)
      .is("read_at", null);
    if (error) throw error;
    return count || 0;
  }

  const db = getLocalDb();
  ensureDb();
  const row = db.prepare("SELECT COUNT(*) as count FROM notifications WHERE reader_slug = ? AND read_at IS NULL").get(readerSlug);
  return row?.count || 0;
}

export async function markAllNotificationsRead(readerSlug) {
  const readAt = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("notifications").update({ read_at: readAt }).eq("reader_slug", readerSlug).is("read_at", null);
    if (error) throw error;
    return readAt;
  }

  const db = getLocalDb();
  ensureDb();
  db.prepare("UPDATE notifications SET read_at = ? WHERE reader_slug = ? AND read_at IS NULL").run(readAt, readerSlug);
  return readAt;
}
