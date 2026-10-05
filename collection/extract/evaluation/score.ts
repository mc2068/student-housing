import { type Extraction, isUnreadable, type ReadExtraction } from "../../domain";
import type { EvaluationPost, Expectation } from "./set";

/** What extraction is scored on: first whether a post is an offer, a demand or not about housing, then each fact. */
export const FIELDS = ["result", "neighbourhood", "kind", "price", "size", "furnished", "gender"] as const;

export type Field = (typeof FIELDS)[number];

type Value = string | number | boolean | null;

export interface Difference {
  field: Field;
  expected: string;
  extracted: string;
}

/** How many of the posts compared on something came out right. */
export interface Tally {
  right: number;
  total: number;
}

export interface Scores {
  fields: Record<Field, Tally>;
  offersRecognised: Tally;
  /** Demands the model did not take for an offer, whatever reason it gave. */
  demandsRejected: Tally;
  notHousingRejected: Tally;
  /** Posts where extraction and expectation differ, with each fact that differs. */
  differing: { post: EvaluationPost; differences: Difference[] }[];
  /** Posts no model could read; they are in no score. */
  unread: EvaluationPost[];
}

/**
 * The fields on which one post can be compared, each with the expected and the extracted value.
 * A post dropped for naming no listed neighbourhood was still read as an offer, but its other
 * facts are lost with the neighbourhood. So the neighbourhood is compared when both sides call
 * the post an offer, and the other facts only when it came back as a listing.
 */
function comparisons(expected: Expectation, extraction: ReadExtraction): [Field, Value, Value][] {
  const extractedResult = extraction.offer || extraction.reason === "no_neighbourhood" ? "offer" : extraction.reason;
  const pairs: [Field, Value, Value][] = [["result", expected.result, extractedResult]];
  if (expected.result !== "offer" || extractedResult !== "offer") return pairs;

  pairs.push(["neighbourhood", expected.neighbourhood, extraction.offer ? extraction.facts.neighbourhoodId : null]);
  if (!extraction.offer) return pairs;

  const { facts } = extraction;
  pairs.push(
    ["kind", expected.kind, facts.kind],
    ["price", expected.price, facts.price],
    ["size", expected.size, facts.size],
    ["furnished", expected.furnished, facts.furnished],
    ["gender", expected.gender, facts.genderRestriction],
  );
  return pairs;
}

/** A fact's value as the scores and the review page write it. */
export const shown = (value: Value) => (value === null ? "none" : String(value));

/** Scores one extraction per post, in the order of the posts; a post without one counts as unread. */
export function score(posts: EvaluationPost[], extractions: (Extraction | undefined)[]): Scores {
  const tally = (): Tally => ({ right: 0, total: 0 });
  const scores: Scores = {
    fields: Object.fromEntries(FIELDS.map((field) => [field, tally()])) as Record<Field, Tally>,
    offersRecognised: tally(),
    demandsRejected: tally(),
    notHousingRejected: tally(),
    differing: [],
    unread: [],
  };
  const count = (into: Tally, right: boolean) => {
    into.total++;
    if (right) into.right++;
  };

  for (const [i, post] of posts.entries()) {
    const extraction = extractions[i];
    if (!extraction || isUnreadable(extraction)) {
      scores.unread.push(post);
      continue;
    }

    const differences: Difference[] = [];
    for (const [field, expected, extracted] of comparisons(post.expected, extraction)) {
      count(scores.fields[field], expected === extracted);
      if (expected !== extracted) differences.push({ field, expected: shown(expected), extracted: shown(extracted) });

      if (field !== "result") continue;
      if (expected === "offer") count(scores.offersRecognised, extracted === "offer");
      if (expected === "demand") count(scores.demandsRejected, extracted !== "offer");
      if (expected === "not_housing") count(scores.notHousingRejected, extracted !== "offer");
    }
    if (differences.length > 0) scores.differing.push({ post, differences });
  }
  return scores;
}
