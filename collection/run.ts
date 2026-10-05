// One collection run. Keys come from the environment: APIFY_API_KEY, GEMINI_API_KEY, and optionally GROQ_API_KEY.
// `npm run collect` reads them from .env.collect and writes to the local database:
//   npm run collect                                 the daily share of newest posts from each Facebook group
//   npm run collect -- --posts 2                    newest 2 posts from each group (about $0.005 a post)
//   npm run collect -- --replay proof/posts.json    posts saved earlier, at no scraping cost
// `npm run collect:hosted` is what GitHub runs every day (docs/daily-collection.md): the same run into the
// hosted database, with the keys and CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in the repository's secrets.
// A run ends as failed when a source could not be collected or a batch could not be read; it still does the rest.
import { readFileSync } from "node:fs";
import { openD1OverHttp } from "../db/d1-http";
import { type Db, LOCAL_DATABASE, openSqlite } from "../db/db";
import { failures, runCollection } from "./collect";
import { dailyPostsPerGroup } from "./credit";
import { facebookGroups } from "./data";
import type { RawPost, Source } from "./domain";
import { withFallback } from "./extract/extractor";
import { configuredExtractors, lastResortExtractors } from "./extract/models";
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
  const posts = Number(option("posts") ?? dailyPostsPerGroup(facebookGroups.length));
  if (!Number.isInteger(posts) || posts < 1 || posts > MAX_POSTS_PER_GROUP) {
    throw new Error(`The posts taken from each group must be a whole number from 1 to ${MAX_POSTS_PER_GROUP}, not ${posts}`);
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

/** The hosted database from outside Cloudflare. Its identifier is not a key: the site's own configuration has it. */
function hostedDatabase(): Db {
  const databaseId = /"database_id":\s*"([^"]+)"/.exec(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"))?.[1];
  if (!databaseId || /^[0-]+$/.test(databaseId)) {
    throw new Error("wrangler.jsonc does not have the hosted database's identifier yet (docs/deploy.md, step 4).");
  }
  return openD1OverHttp({ accountId: env("CLOUDFLARE_ACCOUNT_ID"), databaseId, apiToken: env("CLOUDFLARE_API_TOKEN") });
}

const replay = option("replay");
const hosted = process.argv.includes("--hosted");
const maxPosts = postsPerGroup();
// Every source goes in this one list; the Facebook groups are the only ones for now.
const sources = replay
  ? replaySources(replay)
  : facebookGroups.map((group) => facebookSource(env("APIFY_API_KEY"), group, maxPosts));
const extractor = withFallback(configuredExtractors());
const lastResort = withFallback(lastResortExtractors());

// The database is opened and its tables checked before any source is asked: a post is billed once collected.
const db = hosted ? hostedDatabase() : openSqlite(LOCAL_DATABASE);
const store = await createStore(db);
console.log(
  replay
    ? `Replaying the posts saved in ${replay}.`
    : `Taking the ${maxPosts} newest posts of each of ${sources.length} Facebook groups.`,
);
const report = await runCollection({ sources, extractor, lastResort, store, log: console.log });

// The counts, source by source; what went wrong is said in words underneath.
console.table(Object.fromEntries(Object.entries(report).map(([id, { error, extractionError, ...counts }]) => [id, counts])));
const total = await db.all<{ n: number }>("SELECT COUNT(*) AS n FROM listings");
console.log(`${total[0]?.n ?? 0} listings in the ${hosted ? "hosted" : "local"} database.`);

const failed = failures(report);
// On GitHub, a line that starts with ::error:: is also shown at the top of the run's page.
for (const line of failed) console.error(process.env.GITHUB_ACTIONS ? `::error::${line}` : line);
if (failed.length > 0) process.exitCode = 1;
