import { describe, expect, it } from "vitest";
import type { Extraction, ListingFacts } from "../domain";
import { MASK } from "../redact";
import { type EvaluationPost, type Expectation, formatReport, parseEvaluationSet, reviewPage, score } from "./evaluation";

// Every post here is made up: the real evaluation set is never committed (docs/adr/0002).
const KNOWN = new Set(["el-manar", "le-bardo"]);

const OFFER: Expectation = { result: "offer", kind: "flatshare", price: 350, neighbourhood: "el-manar", size: 2, furnished: true, gender: "girls" };
const DEMAND: Expectation = { result: "demand" };
const NOT_HOUSING: Expectation = { result: "not_housing" };

function post(n: number, expected: Expectation, over: Partial<EvaluationPost> = {}): EvaluationPost {
  return { n, language: "french", url: `https://www.facebook.com/groups/1/permalink/${n}/`, text: `post ${n}`, expected, ...over };
}

const listing = (over: Partial<ListingFacts> = {}): Extraction => ({
  offer: true,
  facts: { kind: "flatshare", price: 350, neighbourhoodId: "el-manar", size: 2, furnished: true, genderRestriction: "girls", ...over },
});
const demand: Extraction = { offer: false, reason: "demand" };
const notHousing: Extraction = { offer: false, reason: "not_housing" };
const noNeighbourhood: Extraction = { offer: false, reason: "no_neighbourhood" };

const differences = (expected: Expectation, extraction: Extraction) =>
  score([post(1, expected)], [extraction]).differing.flatMap((d) => d.differences);

describe("scoring extraction against the evaluation set", () => {
  it("counts every field right when extraction answers what a person expects", () => {
    const scores = score([post(1, OFFER), post(2, DEMAND), post(3, NOT_HOUSING)], [listing(), demand, notHousing]);

    expect(scores.fields).toEqual({
      result: { right: 3, of: 3 },
      neighbourhood: { right: 1, of: 1 },
      kind: { right: 1, of: 1 },
      price: { right: 1, of: 1 },
      size: { right: 1, of: 1 },
      furnished: { right: 1, of: 1 },
      gender: { right: 1, of: 1 },
    });
    expect(scores.differing).toEqual([]);
    expect(scores.unread).toEqual([]);
  });

  it("scores each fact on its own and names the post, the fact and both values", () => {
    const scores = score(
      [post(1, OFFER), post(2, OFFER)],
      [listing(), listing({ price: 550, furnished: null, genderRestriction: "unspecified" })],
    );

    expect(scores.fields.price).toEqual({ right: 1, of: 2 });
    expect(scores.fields.furnished).toEqual({ right: 1, of: 2 });
    expect(scores.fields.gender).toEqual({ right: 1, of: 2 });
    expect(scores.fields.kind).toEqual({ right: 2, of: 2 });
    expect(scores.differing.map((d) => [d.post.n, d.differences])).toEqual([
      [
        2,
        [
          { field: "price", expected: "350", extracted: "550" },
          { field: "furnished", expected: "true", extracted: "none" },
          { field: "gender", expected: "girls", extracted: "unspecified" },
        ],
      ],
    ]);
  });

  it("counts the demands that were rejected, whatever reason the model gave", () => {
    const scores = score([post(1, DEMAND), post(2, DEMAND), post(3, DEMAND)], [demand, notHousing, listing()]);

    expect(scores.demandsRejected).toEqual({ right: 2, of: 3 });
    // The wrong reason still counts against "offer, demand or not housing".
    expect(scores.fields.result).toEqual({ right: 1, of: 3 });
    expect(scores.differing.map((d) => d.post.n)).toEqual([2, 3]);
  });

  it("does not count a demand read as an offer in an unknown place as rejected", () => {
    expect(score([post(1, DEMAND)], [noNeighbourhood]).demandsRejected).toEqual({ right: 0, of: 1 });
  });

  it("counts the offers recognised and the posts not about housing that were rejected", () => {
    const scores = score(
      [post(1, OFFER), post(2, OFFER), post(3, NOT_HOUSING), post(4, NOT_HOUSING)],
      [listing(), demand, notHousing, listing()],
    );

    expect(scores.offersRecognised).toEqual({ right: 1, of: 2 });
    expect(scores.notHousingRejected).toEqual({ right: 1, of: 2 });
  });

  it("scores the facts only on posts that came back as a listing", () => {
    const scores = score([post(1, OFFER), post(2, OFFER)], [listing(), demand]);

    expect(scores.fields.result).toEqual({ right: 1, of: 2 });
    expect(scores.fields.kind).toEqual({ right: 1, of: 1 });
    expect(scores.fields.neighbourhood).toEqual({ right: 1, of: 1 });
    expect(scores.differing[0]?.differences).toEqual([{ field: "result", expected: "offer", extracted: "demand" }]);
  });

  it("agrees when an offer names no listed neighbourhood and extraction found none", () => {
    const scores = score([post(1, { ...OFFER, neighbourhood: null })], [noNeighbourhood]);

    expect(scores.fields.result).toEqual({ right: 1, of: 1 });
    expect(scores.fields.neighbourhood).toEqual({ right: 1, of: 1 });
    // The other facts are lost with the neighbourhood, so they cannot be scored.
    expect(scores.fields.price).toEqual({ right: 0, of: 0 });
    expect(scores.differing).toEqual([]);
  });

  it("names a neighbourhood that was missed, and one that was made up", () => {
    expect(differences(OFFER, noNeighbourhood)).toEqual([{ field: "neighbourhood", expected: "el-manar", extracted: "none" }]);
    expect(differences({ ...OFFER, neighbourhood: null }, listing())).toEqual([
      { field: "neighbourhood", expected: "none", extracted: "el-manar" },
    ]);
    expect(differences(OFFER, listing({ neighbourhoodId: "le-bardo" }))).toEqual([
      { field: "neighbourhood", expected: "el-manar", extracted: "le-bardo" },
    ]);
  });

  it("leaves a post no model could read out of the scores and names it", () => {
    const scores = score([post(1, OFFER), post(2, DEMAND), post(3, DEMAND)], [listing(), undefined, { offer: false, reason: "unreadable" }]);

    expect(scores.fields.result).toEqual({ right: 1, of: 1 });
    expect(scores.demandsRejected).toEqual({ right: 0, of: 0 });
    expect(scores.unread.map((p) => p.n)).toEqual([2, 3]);
  });
});

describe("the evaluation report", () => {
  const posts = [post(1, OFFER), post(2, DEMAND, { language: "arabic" }), post(3, OFFER, { language: "tunisian-latin" })];
  const scores = score(posts, [listing(), listing(), undefined]);
  const report = formatReport({ reviewed: false, note: "", posts }, scores, new Map([[1, "gemini:some-flash"], [2, "gemini:some-flash-lite"]]));

  it("gives accuracy per field and the demand-rejection rate", () => {
    expect(report).toMatch(/Offer, demand or not housing +1\/2 +50%/);
    expect(report).toMatch(/Demands rejected +0\/1 +0%/);
    expect(report).toMatch(/Price +1\/1 +100%/);
  });

  it("says what the set covers, which models answered and that the owner has not confirmed it", () => {
    expect(report).toContain("3 posts: 1 French, 1 Arabic, 1 Tunisian Arabic in Latin letters");
    expect(report).toContain("2 offers, 1 demand, 0 not about housing");
    expect(report).toContain("Read by: gemini:some-flash (1 post), gemini:some-flash-lite (1 post)");
    expect(report).toContain("not yet confirmed by the site owner");
  });

  it("names each post where extraction and expectation differ with the model that read it, and each post left unread", () => {
    expect(report).toContain("#2 [arabic, gemini:some-flash-lite] result: expected demand, extracted offer");
    expect(report).toContain(posts[1]!.url);
    expect(report).toMatch(/Not read by any model.*#3/s);
  });
});

describe("the review page", () => {
  it("shows each post's text and expected facts, with the text escaped", () => {
    const posts = [post(1, OFFER, { text: 'S+2 <b>meublé</b> & "calme"', note: "two prices, the lower one" })];
    const page = reviewPage({ reviewed: false, note: "", posts }, score(posts, [listing({ price: 550 })]));

    expect(page).toContain("S+2 &lt;b&gt;meublé&lt;/b&gt; &amp; &quot;calme&quot;");
    expect(page).not.toContain("<b>meublé</b>");
    expect(page).toContain("el-manar");
    expect(page).toContain("two prices, the lower one");
    expect(page).toContain("price: 550");
  });
});

describe("reading the evaluation set", () => {
  const file = (posts: unknown[]) => JSON.stringify({ reviewed: false, note: "draft", posts });
  const entry = (over: object = {}) => ({ ...post(1, OFFER), ...over });

  it("reads posts with their expected facts", () => {
    const set = parseEvaluationSet(file([post(1, OFFER), post(2, DEMAND, { note: "asks for an agent" })]), KNOWN);

    expect(set.reviewed).toBe(false);
    expect(set.posts).toEqual([post(1, OFFER), post(2, DEMAND, { note: "asks for an agent" })]);
  });

  it("refuses a post whose text still holds a phone number", () => {
    expect(() => parseEvaluationSet(file([entry({ text: "S+1 à louer, tel 22 333 444" })]), KNOWN)).toThrow(/Post 1: .*phone number/);
    expect(() => parseEvaluationSet(file([entry({ text: `S+1 à louer, tel ${MASK}` })]), KNOWN)).not.toThrow();
  });

  it("refuses a post that carries anything besides its text, link and expected facts", () => {
    expect(() => parseEvaluationSet(file([entry({ author: "Someone" })]), KNOWN)).toThrow(/Post 1: .*author/);
  });

  it("refuses an expected neighbourhood that is not on the curated list", () => {
    expect(() => parseEvaluationSet(file([post(1, { ...OFFER, neighbourhood: "atlantis" })]), KNOWN)).toThrow(/Post 1: .*atlantis/);
  });

  it("refuses expected facts a hand edit got wrong", () => {
    const wrong: object[] = [
      { result: "offre" },
      { ...OFFER, kind: "colocation" },
      { ...OFFER, price: "350" },
      { ...OFFER, size: 1.5 },
      { ...OFFER, furnished: "yes" },
      { ...OFFER, gender: "girl" },
      { result: "offer", kind: "rental" },
      { result: "demand", price: 300 },
    ];
    for (const expected of wrong) {
      expect(() => parseEvaluationSet(file([entry({ expected })]), KNOWN), JSON.stringify(expected)).toThrow(/Post 1: /);
    }
  });

  it("refuses two posts with the same number or the same link", () => {
    expect(() => parseEvaluationSet(file([post(1, OFFER), post(1, DEMAND, { url: "https://example.test/2" })]), KNOWN)).toThrow(/Post 1: /);
    expect(() => parseEvaluationSet(file([post(1, OFFER), post(2, DEMAND, { url: post(1, OFFER).url })]), KNOWN)).toThrow(/Post 2: /);
  });
});
