import type { GenderRestriction, Kind } from "../../domain";
import { stripPhoneNumbers } from "../../redact";

// The evaluation set: real posts, each with the facts a person reading it expects. It measures
// extraction by hand whenever the prompt or the models change; a model's answers vary, so it is
// no automated test. The set holds post texts, so it is never committed (docs/adr/0002).

export const LANGUAGES = {
  french: "French",
  arabic: "Arabic",
  "tunisian-latin": "Tunisian Arabic in Latin letters",
} as const;

export type Language = keyof typeof LANGUAGES;

export interface ExpectedOffer {
  result: "offer";
  kind: Kind;
  price: number | null;
  /** null when the post names no neighbourhood on the curated list: an offer, but never a listing. */
  neighbourhood: string | null;
  size: number | null;
  furnished: boolean | null;
  gender: GenderRestriction;
}

/** What a person reading the post expects extraction to answer. */
export type Expectation = ExpectedOffer | { result: "demand" | "not_housing" };

// These are the keys of the site owner's file, read as they are written there.
export interface EvaluationPost {
  /** The number the scores and the review page call the post by. */
  n: number;
  language: Language;
  url: string;
  /** Phone numbers masked, no author. */
  text: string;
  expected: Expectation;
  /** Why the expectation is what it is, where a reader could hesitate. */
  note?: string;
}

export interface EvaluationSet {
  /** Whether the site owner has confirmed the expected facts. */
  reviewed: boolean;
  note: string;
  posts: EvaluationPost[];
}

const KINDS: unknown[] = ["rental", "flatshare"] satisfies Kind[];
const GENDERS: unknown[] = ["girls", "boys", "unspecified"] satisfies GenderRestriction[];
const POST_KEYS = ["n", "language", "url", "text", "expected", "note"];
const OFFER_KEYS = ["result", "kind", "price", "neighbourhood", "size", "furnished", "gender"];

const isRecord = (raw: unknown): raw is Record<string, unknown> => typeof raw === "object" && raw !== null && !Array.isArray(raw);

/** The keys an entry should not have, and the ones it lacks. */
function wrongKeys(entry: Record<string, unknown>, allowed: string[], required: string[]): string | null {
  const extra = Object.keys(entry).filter((key) => !allowed.includes(key));
  if (extra.length > 0) return `has ${extra.join(", ")}, which does not belong there`;
  const missing = required.filter((key) => !(key in entry));
  return missing.length > 0 ? `lacks ${missing.join(", ")}` : null;
}

/** What is wrong with expected facts written by hand, or null. */
function expectationFault(raw: unknown, knownIds: Set<string>): string | null {
  if (!isRecord(raw)) return "expected facts are missing";
  if (raw.result === "demand" || raw.result === "not_housing") {
    return Object.keys(raw).length > 1 ? `a ${raw.result} has no facts besides its result` : null;
  }
  if (raw.result !== "offer") return `result is ${JSON.stringify(raw.result)}, not offer, demand or not_housing`;

  const keys = wrongKeys(raw, OFFER_KEYS, OFFER_KEYS);
  if (keys) return `expected ${keys}`;
  if (!KINDS.includes(raw.kind)) return `kind is ${JSON.stringify(raw.kind)}, not rental or flatshare`;
  if (raw.price !== null && typeof raw.price !== "number") return `price is ${JSON.stringify(raw.price)}, not a number or null`;
  if (raw.neighbourhood !== null && !(typeof raw.neighbourhood === "string" && knownIds.has(raw.neighbourhood))) {
    return `neighbourhood ${JSON.stringify(raw.neighbourhood)} is not on the curated list`;
  }
  if (raw.size !== null && !Number.isInteger(raw.size)) return `size is ${JSON.stringify(raw.size)}, not a whole number or null`;
  if (raw.furnished !== null && typeof raw.furnished !== "boolean") {
    return `furnished is ${JSON.stringify(raw.furnished)}, not true, false or null`;
  }
  if (!GENDERS.includes(raw.gender)) return `gender is ${JSON.stringify(raw.gender)}, not girls, boys or unspecified`;
  return null;
}

/** Reads the evaluation set, refusing anything a hand edit got wrong: a silent typo would score as a miss. */
export function parseEvaluationSet(json: string, knownIds: Set<string>): EvaluationSet {
  const file = JSON.parse(json) as unknown;
  if (!isRecord(file) || !Array.isArray(file.posts)) throw new Error("The evaluation set has no list of posts");

  const numbers = new Set<unknown>();
  const urls = new Set<unknown>();
  for (const [i, raw] of file.posts.entries()) {
    const n = isRecord(raw) && Number.isInteger(raw.n) ? raw.n : `at position ${i + 1}`;
    const fail = (fault: string): never => {
      throw new Error(`Post ${n}: ${fault}`);
    };
    if (!isRecord(raw) || !Number.isInteger(raw.n)) return fail("has no number");

    // Only these fields: an author or an image must never ride along (docs/adr/0002).
    const keys = wrongKeys(raw, POST_KEYS, POST_KEYS.filter((key) => key !== "note"));
    if (keys) fail(keys);
    if (numbers.has(raw.n)) fail("its number is used twice");
    if (urls.has(raw.url)) fail("its link is used twice");
    numbers.add(raw.n);
    urls.add(raw.url);

    if (typeof raw.language !== "string" || !(raw.language in LANGUAGES)) {
      fail(`language is ${JSON.stringify(raw.language)}, not ${Object.keys(LANGUAGES).join(", ")}`);
    }
    if (typeof raw.url !== "string" || typeof raw.text !== "string" || raw.text.trim() === "") fail("needs a link and a text");
    if (stripPhoneNumbers(raw.text as string) !== raw.text) fail("its text still holds a phone number; mask it first");
    if ("note" in raw && typeof raw.note !== "string") fail("its note is not text");
    const fault = expectationFault(raw.expected, knownIds);
    if (fault) fail(fault);
  }

  return {
    reviewed: file.reviewed === true,
    note: typeof file.note === "string" ? file.note : "",
    posts: file.posts as EvaluationPost[],
  };
}
