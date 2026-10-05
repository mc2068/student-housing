import { describe, expect, it } from "vitest";
import type { Faculty } from "../collection/data";
import type { ListingFacts } from "../collection/domain";
import { createStore } from "../collection/store";
import { openSqlite } from "../db/db";
import { type Filters, searchListings } from "./search";

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
  const search = (facultyId: string, criteria: Filters = {}) =>
    searchListings({ facultyId, ...criteria }, { db, faculties: FACULTIES, now: NOW });
  /** The numbers of the listings a search around FST finds, in ascending order. */
  const found = async (criteria: Filters = {}) =>
    (await search("fst", criteria)).map((l) => Number(l.url.split("/").at(-2))).sort((a, b) => a - b);
  return { listing, search, found };
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

  it("shows rentals, flatshares, or both", async () => {
    const { listing, found } = await setup();
    await listing(1, { kind: "rental" });
    await listing(2, { kind: "flatshare" });

    expect(await found({ kind: "rental" })).toEqual([1]);
    expect(await found({ kind: "flatshare" })).toEqual([2]);
    expect(await found()).toEqual([1, 2]);
  });

  it("limits flatshares, and only flatshares, to the per-person budget", async () => {
    const { listing, found } = await setup();
    await listing(1, { kind: "flatshare", price: 300 });
    await listing(2, { kind: "flatshare", price: 400 }); // exactly the budget
    await listing(3, { kind: "flatshare", price: 401 });
    await listing(4, { kind: "rental", price: 1200 });

    expect(await found({ perPersonBudget: 400 })).toEqual([1, 2, 4]);
  });

  it("limits rentals, and only rentals, to the whole-unit budget", async () => {
    const { listing, found } = await setup();
    await listing(1, { kind: "rental", price: 900 });
    await listing(2, { kind: "rental", price: 1000 }); // exactly the budget
    await listing(3, { kind: "rental", price: 1001 });
    await listing(4, { kind: "flatshare", price: 1500 });

    expect(await found({ wholeUnitBudget: 1000 })).toEqual([1, 2, 4]);
  });

  it("applies each budget to its own kind when both are set", async () => {
    const { listing, found } = await setup();
    await listing(1, { kind: "flatshare", price: 350 });
    await listing(2, { kind: "flatshare", price: 700 }); // over per person, though under the whole-unit budget
    await listing(3, { kind: "rental", price: 700 }); // over the per-person budget, which does not apply to it
    await listing(4, { kind: "rental", price: 1100 });

    expect(await found({ perPersonBudget: 400, wholeUnitBudget: 1000 })).toEqual([1, 3]);
    expect(await found({ perPersonBudget: 400, wholeUnitBudget: 1000, kind: "rental" })).toEqual([3]);
    expect(await found({ perPersonBudget: 400, wholeUnitBudget: 1000, kind: "flatshare" })).toEqual([1]);
  });

  it("leaves out a listing without a price only when a budget applies to its kind", async () => {
    const { listing, found } = await setup();
    await listing(1, { kind: "flatshare", price: null });
    await listing(2, { kind: "rental", price: null });

    expect(await found()).toEqual([1, 2]);
    expect(await found({ perPersonBudget: 400 })).toEqual([2]);
    expect(await found({ wholeUnitBudget: 1000 })).toEqual([1]);
    expect(await found({ perPersonBudget: 400, wholeUnitBudget: 1000 })).toEqual([]);
  });

  it("shows listings restricted to the chosen gender and listings with no stated restriction", async () => {
    const { listing, found } = await setup();
    await listing(1, { genderRestriction: "girls" });
    await listing(2, { genderRestriction: "boys" });
    await listing(3, { genderRestriction: "unspecified" });

    expect(await found({ gender: "girls" })).toEqual([1, 3]);
    expect(await found({ gender: "boys" })).toEqual([2, 3]);
    expect(await found()).toEqual([1, 2, 3]);
  });

  it("shows the chosen sizes, studio included, and listings that do not state a size", async () => {
    const { listing, found } = await setup();
    await listing(1, { size: 0 }); // studio
    await listing(2, { size: 1 });
    await listing(3, { size: 2 });
    await listing(4, { size: null });

    expect(await found({ sizes: [0] })).toEqual([1, 4]);
    expect(await found({ sizes: [1, 2] })).toEqual([2, 3, 4]);
    expect(await found({ sizes: [] })).toEqual([1, 2, 3, 4]);
    expect(await found()).toEqual([1, 2, 3, 4]);
  });

  it("takes the largest size choice as that size or more, within the faculty and the 14 days", async () => {
    const { listing, found } = await setup();
    await listing(1, { size: 3 });
    await listing(2, { size: 4 });
    await listing(3, { size: 6 });
    await listing(4, { size: 6, neighbourhoodId: "le-bardo" }); // another faculty's neighbourhood
    await listing(5, { size: 6 }, "2026-09-01T10:00:00.000Z"); // expired

    expect(await found({ sizes: [4] })).toEqual([2, 3]);
    expect(await found({ sizes: [3] })).toEqual([1]);
  });

  it("shows furnished or unfurnished listings, and listings that do not state it", async () => {
    const { listing, found } = await setup();
    await listing(1, { furnished: true });
    await listing(2, { furnished: false });
    await listing(3, { furnished: null });

    expect(await found({ furnished: true })).toEqual([1, 3]);
    expect(await found({ furnished: false })).toEqual([2, 3]);
    expect(await found()).toEqual([1, 2, 3]);
  });

  it("combines every filter with the faculty and with each other", async () => {
    const { listing, search } = await setup();
    const wanted: Partial<ListingFacts> = { kind: "flatshare", price: 350, size: 2, furnished: true, genderRestriction: "girls" };
    await listing(1, wanted);
    await listing(2, { ...wanted, neighbourhoodId: "le-bardo" }); // another faculty's neighbourhood
    await listing(3, { ...wanted, kind: "rental" });
    await listing(4, { ...wanted, price: 450 });
    await listing(5, { ...wanted, genderRestriction: "boys" });
    await listing(6, { ...wanted, size: 1 });
    await listing(7, { ...wanted, furnished: false });
    await listing(8, wanted, "2026-09-01T10:00:00.000Z"); // expired
    await listing(9, { ...wanted, size: null, furnished: null, genderRestriction: "unspecified" });

    const found = await search("fst", { kind: "flatshare", perPersonBudget: 400, gender: "girls", sizes: [2], furnished: true });

    expect(found.map((l) => l.url).sort()).toEqual([url(1), url(9)]);
  });
});
