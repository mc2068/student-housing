import { describe, expect, it } from "vitest";
import { type Db, openSqlite } from "../db/db";
import { runCollection } from "./collect";
import type { Extractor, RawPost, Source } from "./domain";
import { modelExtractor, withFallback } from "./extract/extractor";
import { MASK } from "./redact";
import { createStore, type Store } from "./store";

const NOW = new Date("2026-10-04T18:00:00.000Z");

const OFFER = { offer: true, kind: "flatshare", price: 350, neighbourhood: "el-manar", size: 2, furnished: true, gender: "girls" };
const DEMAND = { offer: false, reason: "demand" };
const NOT_HOUSING = { offer: false, reason: "not_housing" };

function post(n: number, text: string, over: Partial<RawPost> = {}): RawPost {
  return { url: `https://www.facebook.com/groups/1/permalink/${n}/`, text, postedAt: "2026-10-04T10:00:00.000Z", ...over };
}

const source = (id: string, posts: RawPost[]): Source => ({ id, collect: async () => posts });

/** A model that answers each post in the prompt from a canned table keyed by the post's text. */
function fakeModel(answers: Record<string, object | undefined>) {
  const prompts: string[] = [];
  const complete = async (prompt: string) => {
    prompts.push(prompt);
    const results = [...prompt.matchAll(/### POST (\d+)\n([\s\S]*?)(?=\n\n### POST \d+\n|$)/g)].flatMap(([, i, text]) => {
      const answer = answers[text!.trim()];
      return answer ? [{ i: Number(i), ...answer }] : [];
    });
    return JSON.stringify({ results });
  };
  return { prompts, extractor: modelExtractor("fake", complete) };
}

/** An extractor with no model behind it, to see exactly what the collection run hands over. */
function spyExtractor() {
  const received: string[] = [];
  const extractor: Extractor = {
    name: "spy",
    extract: async (texts) => {
      received.push(...texts);
      return texts.map(() => ({
        offer: true as const,
        facts: { kind: "rental" as const, price: 800, neighbourhoodId: "le-bardo", size: 1, furnished: null, genderRestriction: "unspecified" as const },
      }));
    },
  };
  return { received, extractor };
}

async function setup() {
  const db = openSqlite(":memory:");
  const store = await createStore(db);
  const collect = (sources: Source[], extractor: Extractor) =>
    runCollection({ sources, extractor, store, now: NOW, pauseMs: 0 });
  return { db, store, collect };
}

const listings = (db: Db) => db.all<Record<string, unknown>>("SELECT * FROM listings ORDER BY url");

/** Everything the database holds, as text, to check what can never be in it. */
async function everythingStored(db: Db): Promise<string> {
  return JSON.stringify([await db.all("SELECT * FROM listings"), await db.all("SELECT * FROM collected_posts")]);
}

describe("collection run", () => {
  it("stores an offer as a listing with its facts, excerpt and dates", async () => {
    const { db, collect } = await setup();
    const { extractor } = fakeModel({ "coloc pour fille manar 2, S+2, 350dt": OFFER });

    await collect([source("fb-a", [post(1, "coloc pour fille manar 2, S+2, 350dt")])], extractor);

    expect(await listings(db)).toEqual([
      {
        url: "https://www.facebook.com/groups/1/permalink/1/",
        source_id: "fb-a",
        kind: "flatshare",
        price: 350,
        neighbourhood_id: "el-manar",
        size: 2,
        furnished: 1,
        gender_restriction: "girls",
        excerpt: "coloc pour fille manar 2, S+2, 350dt",
        posted_at: "2026-10-04T10:00:00.000Z",
        collected_at: "2026-10-04T18:00:00.000Z",
      },
    ]);
  });

  it("stores a post date written with a time offset as the same instant in UTC", async () => {
    const { db, collect } = await setup();
    const { extractor } = fakeModel({ "S+1 au Bardo": OFFER });

    await collect([source("fb-a", [post(1, "S+1 au Bardo", { postedAt: "2026-10-04T11:00:00+01:00" })])], extractor);

    expect(await listings(db)).toMatchObject([{ posted_at: "2026-10-04T10:00:00.000Z" }]);
  });

  it("stores nothing for demands and posts not about housing", async () => {
    const { db, collect } = await setup();
    const { extractor } = fakeModel({ "je cherche une chambre": DEMAND, "frigo 350dt": NOT_HOUSING });

    const report = await collect([source("fb-a", [post(1, "je cherche une chambre"), post(2, "frigo 350dt")])], extractor);

    expect(await listings(db)).toEqual([]);
    expect(report["fb-a"]).toMatchObject({ listings: 0, demands: 1, notHousing: 1 });
  });

  it("drops an offer whose neighbourhood is missing or invented by the model", async () => {
    const { db, collect } = await setup();
    const { extractor } = fakeModel({
      "S+1 à louer 800dt": { ...OFFER, neighbourhood: null },
      "S+1 à Atlantis": { ...OFFER, neighbourhood: "atlantis" },
    });

    const report = await collect([source("fb-a", [post(1, "S+1 à louer 800dt"), post(2, "S+1 à Atlantis")])], extractor);

    expect(await listings(db)).toEqual([]);
    expect(report["fb-a"]).toMatchObject({ listings: 0, noNeighbourhood: 2 });
  });

  it("stores an offer that states no price, size or furnishing", async () => {
    const { db, collect } = await setup();
    const { extractor } = fakeModel({
      "chambre au Bardo, prix en privé": { offer: true, kind: "rental", price: null, neighbourhood: "le-bardo" },
    });

    await collect([source("fb-a", [post(1, "chambre au Bardo, prix en privé")])], extractor);

    expect(await listings(db)).toMatchObject([
      { kind: "rental", price: null, size: null, furnished: null, gender_restriction: "unspecified", neighbourhood_id: "le-bardo" },
    ]);
  });

  it.each([
    ["a price in millimes", { price: 350000 }, { price: null }],
    ["a negative price", { price: -350 }, { price: null }],
    ["a fractional price", { price: 349.6 }, { price: 350 }],
    ["an absurd size", { size: 250 }, { size: null }],
    ["a fractional size", { size: 1.5 }, { size: null }],
  ])("stores the listing but not %s", async (_, wrong, stored) => {
    const { db, collect } = await setup();
    const { extractor } = fakeModel({ "studio manar": { ...OFFER, ...wrong } });

    await collect([source("fb-a", [post(1, "studio manar")])], extractor);

    expect(await listings(db)).toMatchObject([stored]);
  });

  it("neither duplicates nor reads again a post collected a second time", async () => {
    const { db, collect } = await setup();
    const model = fakeModel({ "studio manar": OFFER, "je cherche": DEMAND });
    const posts = [post(1, "studio manar"), post(2, "je cherche")];

    await collect([source("fb-a", posts)], model.extractor);
    const second = await collect([source("fb-a", posts)], model.extractor);

    expect(await listings(db)).toHaveLength(1);
    expect(model.prompts).toHaveLength(1);
    expect(second["fb-a"]).toMatchObject({ collected: 2, alreadySeen: 2, listings: 0, demands: 0 });
  });

  it("reads once a post that two sources return in the same run", async () => {
    const { db, collect } = await setup();
    const model = fakeModel({ "studio manar": OFFER });

    const report = await collect(
      [source("fb-a", [post(1, "studio manar")]), source("fb-b", [post(1, "studio manar")])],
      model.extractor,
    );

    expect(await listings(db)).toMatchObject([{ source_id: "fb-a" }]);
    expect(report["fb-a"]).toMatchObject({ listings: 1 });
    expect(report["fb-b"]).toMatchObject({ collected: 1, alreadySeen: 1, listings: 0 });
  });

  it("hands the extractor post text with phone numbers already masked", async () => {
    const { db, collect } = await setup();
    const spy = spyExtractor();

    await collect([source("fb-a", [post(1, "S+1 bardo 800dt appeler 22 333 444 ou ٩٨٧٦٥٤٣٢")])], spy.extractor);

    expect(spy.received).toEqual([`S+1 bardo 800dt appeler ${MASK} ou ${MASK}`]);
    expect(await everythingStored(db)).not.toMatch(/22 333 444|٩٨٧٦٥٤٣٢/);
    expect(await listings(db)).toMatchObject([{ excerpt: `S+1 bardo 800dt appeler ${MASK} ou ${MASK}` }]);
  });

  it("passes on nothing a source attached about the author, to the extractor or the database", async () => {
    const { db, collect } = await setup();
    const spy = spyExtractor();
    const withAuthor = { ...post(1, "S+1 bardo 800dt"), authorName: "Someone Real", imageUrls: ["https://example.com/a.jpg"] };

    await collect([source("fb-a", [withAuthor])], spy.extractor);

    expect(spy.received).toEqual(["S+1 bardo 800dt"]);
    expect(await listings(db)).toHaveLength(1);
    expect(await everythingStored(db)).not.toMatch(/Someone Real|example\.com/);
  });

  it("uses the fallback model when the first one fails", async () => {
    const { db, collect } = await setup();
    const broken = modelExtractor("broken", async () => {
      throw new Error("quota spent");
    });
    const { extractor: working } = fakeModel({ "studio manar": OFFER });

    const report = await collect([source("fb-a", [post(1, "studio manar")])], withFallback([broken, working]));

    expect(await listings(db)).toHaveLength(1);
    expect(report["fb-a"]).toMatchObject({ listings: 1, unreadable: 0 });
  });

  it("leaves unread posts for the next run when no model can read them", async () => {
    const { db, collect } = await setup();
    const broken = modelExtractor("broken", async () => {
      throw new Error("quota spent");
    });
    const posts = [post(1, "studio manar")];

    const first = await collect([source("fb-a", posts)], broken);
    expect(first["fb-a"]).toMatchObject({ listings: 0, unreadable: 1, extractionError: "quota spent" });
    expect(await listings(db)).toEqual([]);

    const second = await collect([source("fb-a", posts)], fakeModel({ "studio manar": OFFER }).extractor);
    expect(second["fb-a"]).toMatchObject({ alreadySeen: 0, listings: 1 });
    expect(await listings(db)).toHaveLength(1);
  });

  it.each([
    ["skipped in its answer", undefined],
    ["answered without saying whether it is an offer", { kind: "rental" }],
    ["answered as an offer of an unknown kind", { ...OFFER, kind: "villa" }],
  ])("leaves for the next run a post the model %s", async (_, garbled) => {
    const { db, collect } = await setup();
    const { extractor } = fakeModel({ "studio manar": OFFER, "texte illisible": garbled });

    const report = await collect([source("fb-a", [post(1, "studio manar"), post(2, "texte illisible")])], extractor);

    expect(report["fb-a"]).toMatchObject({ listings: 1, notHousing: 0, unreadable: 1 });
    expect(await db.all("SELECT url FROM collected_posts")).toEqual([{ url: post(1, "").url }]);
  });

  it("reads a model answer given as a bare list", async () => {
    const { db, collect } = await setup();
    const bareList = modelExtractor("small", async () => JSON.stringify([{ i: 0, ...OFFER }]));

    await collect([source("fb-a", [post(1, "studio manar")])], bareList);

    expect(await listings(db)).toHaveLength(1);
  });

  it("keeps going when one source fails and reports the failure", async () => {
    const { db, collect } = await setup();
    const { extractor } = fakeModel({ "studio manar": OFFER });
    const failing: Source = {
      id: "tayara",
      collect: async () => {
        throw new Error("site unreachable");
      },
    };

    const report = await collect([failing, source("fb-a", [post(1, "studio manar")])], extractor);

    expect(report["tayara"]).toMatchObject({ collected: 0, error: "site unreachable" });
    expect(report["fb-a"]).toMatchObject({ listings: 1 });
    expect(await listings(db)).toHaveLength(1);
  });

  it("skips posts older than 14 days without reading them", async () => {
    const { db, collect } = await setup();
    const model = fakeModel({ "vieux studio manar": OFFER, "studio manar": OFFER });

    const report = await collect(
      [
        source("fb-a", [
          post(1, "vieux studio manar", { postedAt: "2026-09-20T17:59:59.000Z" }),
          post(2, "studio manar", { postedAt: "2026-09-20T18:00:00.000Z" }),
        ]),
      ],
      model.extractor,
    );

    expect(report["fb-a"]).toMatchObject({ collected: 2, expired: 1, listings: 1 });
    expect(model.prompts.join()).not.toContain("vieux studio manar");
    expect(await listings(db)).toMatchObject([{ url: post(2, "").url }]);
  });

  it("reports counts for each source", async () => {
    const { collect } = await setup();
    const { extractor } = fakeModel({
      "studio manar": OFFER,
      "S+2 bardo": { ...OFFER, kind: "rental", neighbourhood: "le-bardo" },
      "je cherche": DEMAND,
      "frigo": NOT_HOUSING,
      "S+1 nulle part": { ...OFFER, neighbourhood: null },
    });

    const report = await collect(
      [
        source("fb-a", [post(1, "studio manar"), post(2, "je cherche"), post(3, "frigo")]),
        source("fb-b", [post(4, "S+2 bardo"), post(5, "S+1 nulle part")]),
      ],
      extractor,
    );

    expect(report).toEqual({
      "fb-a": { collected: 3, expired: 0, alreadySeen: 0, listings: 1, demands: 1, notHousing: 1, noNeighbourhood: 0, unreadable: 0 },
      "fb-b": { collected: 2, expired: 0, alreadySeen: 0, listings: 1, demands: 0, notHousing: 0, noNeighbourhood: 1, unreadable: 0 },
    });
  });

  it("sends more posts than one batch holds in several requests", async () => {
    const { db, collect } = await setup();
    const texts = Array.from({ length: 12 }, (_, i) => `studio manar ${i}`);
    const model = fakeModel(Object.fromEntries(texts.map((t) => [t, OFFER])));

    await collect([source("fb-a", texts.map((t, i) => post(i, t)))], model.extractor);

    expect(model.prompts).toHaveLength(2);
    expect(await listings(db)).toHaveLength(12);
  });
});

describe("store", () => {
  const record = (store: Store, price: number) =>
    store.record(
      { sourceId: "fb-a", ...post(1, "S+1 bardo") },
      { offer: true, facts: { kind: "rental", price, neighbourhoodId: "le-bardo", size: 1, furnished: null, genderRestriction: "unspecified" } },
      NOW,
    );

  it("writes over a listing recorded twice, as after a run that died halfway, and never doubles it", async () => {
    const { db, store } = await setup();

    await record(store, 800);
    await record(store, 850);

    expect(await listings(db)).toMatchObject([{ price: 850 }]);
    expect(await db.all("SELECT outcome FROM collected_posts")).toEqual([{ outcome: "listing" }]);
  });
});
