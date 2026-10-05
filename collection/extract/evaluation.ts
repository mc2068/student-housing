import { type Extraction, type GenderRestriction, isUnreadable, type Kind, type ReadExtraction } from "../domain";
import { stripPhoneNumbers } from "../redact";

// The evaluation set: real posts, each with the facts a person reading it expects. It measures
// extraction by hand whenever the prompt or the models change; a model's answers vary, so it is
// no automated test. The set holds post texts, so it is never committed (docs/adr/0002).

const LANGUAGES = {
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

export interface EvaluationPost {
  /** The number the report and the review page call the post by. */
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

const FIELD_LABELS = {
  result: "Offer, demand or not housing",
  neighbourhood: "Neighbourhood",
  kind: "Kind",
  price: "Price",
  size: "Size",
  furnished: "Furnished",
  gender: "Gender restriction",
} as const;

export type Field = keyof typeof FIELD_LABELS;
const FIELDS = Object.keys(FIELD_LABELS) as Field[];

type Value = string | number | boolean | null;

export interface Difference {
  field: Field;
  expected: string;
  extracted: string;
}

export interface Tally {
  right: number;
  of: number;
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

const shown = (value: Value) => (value === null ? "none" : String(value));

/** Scores one extraction per post, in the order of the posts; a post without one counts as unread. */
export function score(posts: EvaluationPost[], extractions: (Extraction | undefined)[]): Scores {
  const tally = (): Tally => ({ right: 0, of: 0 });
  const scores: Scores = {
    fields: Object.fromEntries(FIELDS.map((field) => [field, tally()])) as Record<Field, Tally>,
    offersRecognised: tally(),
    demandsRejected: tally(),
    notHousingRejected: tally(),
    differing: [],
    unread: [],
  };
  const count = (into: Tally, right: boolean) => {
    into.of++;
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

const counted = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

function line(label: string, { right, of }: Tally): string {
  const share = of === 0 ? "n/a" : `${Math.round((100 * right) / of)}%`;
  return `${label.padEnd(36)}${`${right}/${of}`.padStart(6)}${share.padStart(6)}`;
}

/**
 * The scores as text: accuracy per field, the demand-rejection rate, and every post that differs.
 * `readBy` names the model that answered each post, by the post's number: a miss by the last
 * fallback model says less about the prompt than one by the first.
 */
export function formatReport(set: EvaluationSet, scores: Scores, readBy: Map<number, string>): string {
  const { posts } = set;
  const models = new Map<string, number>();
  for (const model of readBy.values()) models.set(model, (models.get(model) ?? 0) + 1);
  const speaking = (language: Language) => posts.filter((post) => post.language === language).length;
  const expecting = (result: Expectation["result"]) => posts.filter((post) => post.expected.result === result).length;
  const languages = (Object.keys(LANGUAGES) as Language[]).map((language) => `${speaking(language)} ${LANGUAGES[language]}`);

  const lines = [
    "Extraction accuracy on the evaluation set",
    "",
    `${counted(posts.length, "post")}: ${languages.join(", ")}`,
    `Expected: ${counted(expecting("offer"), "offer")}, ${counted(expecting("demand"), "demand")}, ${expecting("not_housing")} not about housing`,
    set.reviewed ? "Expected facts confirmed by the site owner." : "Expected facts drafted, not yet confirmed by the site owner.",
    `Read by: ${[...models].map(([model, n]) => `${model} (${counted(n, "post")})`).join(", ") || "no model"}`,
    "",
    line(FIELD_LABELS.result, scores.fields.result),
    line("  Offers recognised", scores.offersRecognised),
    line("  Demands rejected", scores.demandsRejected),
    line("  Not-housing posts rejected", scores.notHousingRejected),
    ...FIELDS.filter((field) => field !== "result").map((field) => line(FIELD_LABELS[field], scores.fields[field])),
    "",
    "The neighbourhood is scored on posts both sides call an offer; kind, price, size, furnished",
    "and gender restriction on posts that came back as a listing.",
    "",
    `Extraction and expectation differ on ${counted(scores.differing.length, "post")}${scores.differing.length > 0 ? ":" : "."}`,
  ];
  for (const { post, differences } of scores.differing) {
    const facts = differences.map((d) => `${d.field}: expected ${d.expected}, extracted ${d.extracted}`).join("; ");
    lines.push(`#${post.n} [${post.language}, ${readBy.get(post.n)}] ${facts}`, `    ${post.url}`);
  }
  if (scores.unread.length > 0) {
    lines.push("", `Not read by any model, and in no score: ${scores.unread.map((post) => `#${post.n}`).join(", ")}`);
  }
  return lines.join("\n");
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One page to read every post next to its expected facts, for the site owner to confirm or correct them. */
export function reviewPage(set: EvaluationSet, scores: Scores): string {
  const differing = new Map(scores.differing.map(({ post, differences }) => [post.n, differences]));
  const unread = new Set(scores.unread.map((post) => post.n));

  const rows = set.posts.map((post) => {
    const { result, ...facts } = post.expected;
    const expected = [`<strong>${result}</strong>`, ...Object.entries(facts).map(([fact, value]) => `${fact}: ${escapeHtml(shown(value))}`)];
    const extracted = unread.has(post.n)
      ? ["not read"]
      : (differing.get(post.n) ?? []).map((d) => `${d.field}: ${escapeHtml(d.extracted)}`);
    return `<tr${extracted.length > 0 ? ' class="differs"' : ""}>
<td>#${post.n}<br><small>${post.language}</small></td>
<td><p dir="auto">${escapeHtml(post.text)}</p><a href="${escapeHtml(post.url)}">post</a></td>
<td>${expected.join("<br>")}</td>
<td>${extracted.join("<br>")}</td>
<td>${escapeHtml(post.note ?? "")}</td>
</tr>`;
  });

  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Evaluation set: expected facts</title>
<style>
body { font: 15px/1.4 system-ui, sans-serif; margin: 1.5rem; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #bbb; padding: .4rem .6rem; vertical-align: top; text-align: left; }
td p { margin: 0 0 .3rem; white-space: pre-wrap; max-width: 60ch; }
td:nth-child(3), td:nth-child(4) { white-space: nowrap; }
tr.differs td:nth-child(4) { background: #fde9c8; }
</style>
<h1>Evaluation set: expected facts</h1>
<p>${set.reviewed ? "Confirmed by the site owner." : "Drafted, not yet confirmed by the site owner."} ${escapeHtml(set.note)}</p>
<p>Read each post and check the column "Expected". The column "Extraction answered" shows only what the models
answered differently in the last run: a likely place for a wrong expectation, or for a real miss.</p>
<p>To correct a post, change its <code>expected</code> in <code>proof/evaluation-set.json</code> (posts are in the
same order, each with its number <code>n</code>). When every post is right, set <code>reviewed</code> to
<code>true</code> at the top of that file. Then run <code>npm run evaluate -- --keep-answers</code>: it scores the
saved answers again without calling a model and rewrites this page.</p>
<table>
<tr><th>Post</th><th>Text</th><th>Expected</th><th>Extraction answered</th><th>Note</th></tr>
${rows.join("\n")}
</table>
</html>
`;
}
