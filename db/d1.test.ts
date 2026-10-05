import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { getPlatformProxy } from "wrangler";
import type { Faculty } from "../collection/data";
import type { ListingFacts } from "../collection/domain";
import { createStore } from "../collection/store";
import { searchListings } from "../search/search";
import { type D1Binding, openD1 } from "./d1";
import { openD1OverHttp } from "./d1-http";
import { type Db, openSqlite } from "./db";

const NOW = new Date("2026-10-05T12:00:00.000Z");
const FACULTIES: Faculty[] = [{ id: "fst", name: "fst", short: "fst", campus: "", neighbourhoods: ["el-manar", "el-omrane"] }];
const FACTS: ListingFacts = { kind: "flatshare", price: 350, neighbourhoodId: "el-manar", size: 2, furnished: true, genderRestriction: "girls" };
const url = (n: number) => `https://www.facebook.com/groups/1/permalink/${n}/`;

/** Fills a database the way a collection run and the site owner do, and searches it. */
async function fillAndSearch(db: Db) {
  const store = await createStore(db);
  const listing = (n: number, facts: Partial<ListingFacts>, postedAt: string) =>
    store.record({ url: url(n), sourceId: "fb-a", text: `post ${n}`, postedAt }, { offer: true, facts: { ...FACTS, ...facts } }, NOW);
  await listing(1, {}, "2026-10-05T10:00:00.000Z");
  await listing(2, { kind: "rental", price: null, size: null, furnished: null, genderRestriction: "unspecified" }, "2026-10-04T10:00:00.000Z");
  await listing(3, { neighbourhoodId: "el-omrane", genderRestriction: "boys" }, "2026-10-03T10:00:00.000Z");
  await listing(4, { neighbourhoodId: "le-bardo" }, "2026-10-05T11:00:00.000Z");
  await listing(5, {}, "2026-09-01T10:00:00.000Z");
  await listing(6, {}, "2026-10-05T09:00:00.000Z");
  // The same post recorded again writes over its listing.
  await listing(6, { price: 400 }, "2026-10-05T09:00:00.000Z");
  await db.run("INSERT INTO hidden_listings (url) VALUES (?)", url(1));
  return {
    all: await searchListings({ facultyId: "fst" }, { db, faculties: FACULTIES, now: NOW }),
    girls: await searchListings({ facultyId: "fst", gender: "girls", sizes: [2, 4], furnished: true, perPersonBudget: 400 }, { db, faculties: FACULTIES, now: NOW }),
    seen: [...(await store.seen([url(1), url(99)]))],
    hidden: [...(await store.hidden([url(1), url(2)]))],
  };
}

// The hosted database is Cloudflare D1. This runs the one wrangler.jsonc binds, on this machine and in memory.
describe("the D1 database", () => {
  let d1: D1Binding;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    // Nothing kept on disk, and no local environment file read.
    const proxy = await getPlatformProxy<{ DB: D1Binding }>({ persist: false, envFiles: [] });
    d1 = proxy.env.DB;
    dispose = proxy.dispose;
  }, 60_000);

  afterAll(() => dispose?.());

  // Each test fills the one database from nothing.
  afterEach(async () => {
    vi.unstubAllGlobals();
    for (const table of ["listings", "collected_posts", "hidden_listings"]) await d1.prepare(`DROP TABLE IF EXISTS ${table}`).run();
  });

  it("stores and finds listings exactly as local SQLite does", async () => {
    const onD1 = await fillAndSearch(openD1(d1));

    expect(onD1.all.map((l) => l.url)).toEqual([url(6), url(2), url(3)]);
    expect(onD1.all[0]?.price).toBe(400);
    expect(onD1).toEqual(await fillAndSearch(openSqlite(":memory:")));
  });

  // The daily collection run reaches the hosted database from outside Cloudflare (db/d1-http.ts). Cloudflare's
  // side of that is played here by this local D1, handed each statement and its values as they arrive.
  it("stores and finds the same listings when reached over Cloudflare's HTTP API", async () => {
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      const { sql, params } = JSON.parse(String(init.body)) as { sql: string; params?: (string | number | null)[] };
      const answer = params ? await d1.prepare(sql).bind(...params).all() : await d1.prepare(sql).run();
      return Response.json({ errors: [], messages: [], result: [answer], success: true });
    });

    const overHttp = await fillAndSearch(openD1OverHttp({ accountId: "account", databaseId: "database", apiToken: "token", retryWaitsMs: [] }));

    expect(overHttp.all.map((l) => l.url)).toEqual([url(6), url(2), url(3)]);
    expect(overHttp).toEqual(await fillAndSearch(openSqlite(":memory:")));
  });
});
