import { describe, expect, it } from "vitest";
import type { Faculty } from "../collection/data";
import type { ListingFacts } from "../collection/domain";
import { createStore } from "../collection/store";
import { openSqlite } from "../db/db";
import { searchListings } from "./search";

const NOW = new Date("2026-10-05T12:00:00.000Z");

const faculty = (id: string, neighbourhoods: string[]): Faculty => ({ id, name: id, short: id, campus: "", neighbourhoods });

const FACULTIES = [faculty("fst", ["el-manar", "el-omrane"]), faculty("isg", ["le-bardo"])];

const FACTS: ListingFacts = { kind: "flatshare", price: 350, neighbourhoodId: "el-manar", size: 2, furnished: true, genderRestriction: "girls" };

const url = (n: number) => `https://www.facebook.com/groups/1/permalink/${n}/`;

/** A database filled the way a collection run fills it, and a search over it. */
async function setup() {
  const db = openSqlite(":memory:");
  const store = await createStore(db);
  const listing = (n: number, facts: Partial<ListingFacts> = {}, postedAt = "2026-10-05T10:00:00.000Z") =>
    store.record(
      { url: url(n), sourceId: "fb-a", text: `post ${n}`, postedAt },
      { offer: true, facts: { ...FACTS, ...facts } },
      NOW,
    );
  const search = (facultyId: string) => searchListings({ facultyId }, { db, faculties: FACULTIES, now: NOW });
  return { listing, search };
}

describe("search", () => {
  it("returns only listings in the faculty's neighbourhoods", async () => {
    const { listing, search } = await setup();
    await listing(1, { neighbourhoodId: "el-manar" });
    await listing(2, { neighbourhoodId: "le-bardo" });
    await listing(3, { neighbourhoodId: "el-omrane" });

    const found = await search("fst");

    expect(found.map((l) => l.url).sort()).toEqual([url(1), url(3)]);
  });

  it("returns nothing for a faculty that is not in the list", async () => {
    const { listing, search } = await setup();
    await listing(1);

    expect(await search("sorbonne")).toEqual([]);
  });

  it("returns each listing with its facts, source, excerpt, link and post date", async () => {
    const { listing, search } = await setup();
    await listing(1, { kind: "rental", price: null, neighbourhoodId: "el-omrane", size: null, furnished: null, genderRestriction: "unspecified" });
    await listing(2, { furnished: false }, "2026-10-04T10:00:00.000Z");

    expect(await search("fst")).toEqual([
      {
        url: url(1),
        sourceId: "fb-a",
        kind: "rental",
        price: null,
        neighbourhoodId: "el-omrane",
        size: null,
        furnished: null,
        genderRestriction: "unspecified",
        excerpt: "post 1",
        postedAt: "2026-10-05T10:00:00.000Z",
      },
      {
        url: url(2),
        sourceId: "fb-a",
        kind: "flatshare",
        price: 350,
        neighbourhoodId: "el-manar",
        size: 2,
        furnished: false,
        genderRestriction: "girls",
        excerpt: "post 2",
        postedAt: "2026-10-04T10:00:00.000Z",
      },
    ]);
  });

  it("sorts listings newest first", async () => {
    const { listing, search } = await setup();
    await listing(1, {}, "2026-10-03T08:00:00.000Z");
    await listing(2, {}, "2026-10-05T09:00:00.000Z");
    await listing(3, {}, "2026-10-04T23:00:00.000Z");

    const found = await search("fst");

    expect(found.map((l) => l.url)).toEqual([url(2), url(3), url(1)]);
  });

  it("shows a listing for 14 days from its post date, and no longer", async () => {
    const { listing, search } = await setup();
    await listing(1, {}, "2026-09-21T12:00:01.000Z"); // 13 days 23:59:59 old
    await listing(2, {}, "2026-09-21T12:00:00.000Z"); // 14 days old to the second
    await listing(3, {}, "2026-09-21T11:59:59.000Z"); // 14 days 00:00:01 old
    await listing(4, {}, "2026-08-01T10:00:00.000Z");

    const found = await search("fst");

    expect(found.map((l) => l.url)).toEqual([url(1), url(2)]);
  });
});
