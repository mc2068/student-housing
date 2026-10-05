// One collection run into the local database.
// Keys come from .env.local: APIFY_API_KEY, GEMINI_API_KEY, and optionally GROQ_API_KEY.
//   npm run collect -- --posts 6                    newest 6 posts from each Facebook group (about $0.005 a post)
//   npm run collect -- --replay proof/posts.json    posts saved earlier, at no scraping cost
import { readFileSync } from "node:fs";
import { LOCAL_DATABASE, openSqlite } from "../db/db";
import { runCollection } from "./collect";
import { facebookGroups } from "./data";
import type { RawPost, Source } from "./domain";
import { withFallback } from "./extract/extractor";
import { configuredExtractors } from "./extract/models";
import { facebookSource } from "./sources/facebook-apify";
import { createStore } from "./store";

// A mistyped limit must not turn into "no limit": every post is billed.
const MAX_POSTS_PER_GROUP = 50;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function option(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function postsPerGroup(): number {
  const posts = Number(option("posts") ?? 6);
  if (!Number.isInteger(posts) || posts < 1 || posts > MAX_POSTS_PER_GROUP) {
    throw new Error(`--posts must be a whole number from 1 to ${MAX_POSTS_PER_GROUP}`);
  }
  return posts;
}

/** Saved posts name the group they came from; each group replays its own as if it had just collected them. */
function replaySources(file: string): Source[] {
  const saved = JSON.parse(readFileSync(file, "utf8")) as (RawPost & { source: string })[];
  return facebookGroups.map((group) => ({
    id: group.id,
    collect: async () => saved.filter((post) => post.source === group.id),
  }));
}

const replay = option("replay");
const maxPosts = postsPerGroup();
const sources = replay
  ? replaySources(replay)
  : facebookGroups.map((group) => facebookSource(env("APIFY_API_KEY"), group, maxPosts));

const db = openSqlite(LOCAL_DATABASE);
const report = await runCollection({ sources, extractor: withFallback(configuredExtractors()), store: await createStore(db) });

console.table(report);
const total = await db.all<{ n: number }>("SELECT COUNT(*) AS n FROM listings");
console.log(`${total[0]?.n ?? 0} listings in the database.`);
