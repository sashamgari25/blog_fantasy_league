import { readFileSync } from "fs";
import path from "path";
import { randomUUID, scryptSync } from "crypto";
import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();
const seedPath = path.join(projectRoot, "data", "league.json");
const envPath = path.join(projectRoot, ".env.local");

function readSeed() {
  return JSON.parse(readFileSync(seedPath, "utf8"));
}

function loadLocalEnv() {
  const raw = readFileSync(envPath, "utf8");
  raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .forEach((line) => {
      const separatorIndex = line.indexOf("=");
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString("hex");
}

async function main() {
  loadLocalEnv();

  const url = requireEnv("SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const nischalPassword = requireEnv("NISCHAL_PASSWORD");
  const shreyasPassword = requireEnv("SHREYAS_PASSWORD");

  const supabase = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const seed = readSeed();

  const players = Object.values(seed.players).map((player) => ({
    id: player.id,
    slug: player.slug,
    name: player.name,
    style: player.style,
    bio: player.bio,
    total_points: player.totalPoints,
    summary: player.summary,
    captain: player.captain,
    team_name: player.teamName,
    team_json: player.team
  }));

  const users = Object.values(seed.players).map((player) => {
    const salt = randomUUID();
    const password = player.slug === "nischal" ? nischalPassword : shreyasPassword;

    return {
      id: player.id,
      slug: player.slug,
      name: player.name,
      username: null,
      email: null,
      role: "author",
      password_hash: hashPassword(password, salt),
      password_salt: salt
    };
  });

  const posts = seed.posts.map((post) => ({
    id: post.id,
    slug: post.slug,
    author_slug: post.authorSlug,
    title: post.title,
    date: post.date,
    result: post.result,
    summary: post.summary,
    content: post.content,
    image_url: post.imageUrl || "",
    tags_json: post.tags,
    created_at: post.date
  }));

  const leagueState = {
    id: 1,
    fixture: seed.fixture,
    journal_date: seed.journal.date
  };

  const steps = [
    supabase.from("players").upsert(players, { onConflict: "slug" }),
    supabase.from("users").upsert(users, { onConflict: "slug" }),
    supabase.from("league_state").upsert(leagueState, { onConflict: "id" }),
    supabase.from("posts").upsert(posts, { onConflict: "slug" })
  ];

  const results = await Promise.all(steps);
  const failed = results.find((result) => result.error);

  if (failed?.error) {
    throw failed.error;
  }

  console.log("Supabase seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
