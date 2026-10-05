import { type Field, FIELDS, type Scores, type Tally } from "./score";
import { type EvaluationSet, type Expectation, type Language, LANGUAGES } from "./set";

const FIELD_LABELS: Record<Field, string> = {
  result: "Offer, demand or not housing",
  neighbourhood: "Neighbourhood",
  kind: "Kind",
  price: "Price",
  size: "Size",
  furnished: "Furnished",
  gender: "Gender restriction",
};

const counted = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

function line(label: string, { right, total }: Tally): string {
  const share = total === 0 ? "n/a" : `${Math.round((100 * right) / total)}%`;
  return `${label.padEnd(36)}${`${right}/${total}`.padStart(6)}${share.padStart(6)}`;
}

/** Post numbers as text, a run of neighbours folded into its two ends: "#1 to #10, #14". */
function numbered(numbers: number[]): string {
  const runs: { first: number; last: number }[] = [];
  for (const number of [...numbers].sort((a, b) => a - b)) {
    const run = runs.at(-1);
    if (run && number === run.last + 1) run.last = number;
    else runs.push({ first: number, last: number });
  }
  return runs.map(({ first, last }) => (first === last ? `#${first}` : `#${first} to #${last}`)).join(", ");
}

/**
 * The scores as text: accuracy per field, the demand-rejection rate, and every post that differs.
 * `readBy` names the model that answered each post, by the post's number: a miss by the last
 * fallback model says less about the prompt than one by the first.
 */
export function formatScores(set: EvaluationSet, scores: Scores, readBy: Map<number, string>): string {
  const { posts } = set;
  const postsOf = new Map<string, number[]>();
  for (const [number, model] of readBy) postsOf.set(model, [...(postsOf.get(model) ?? []), number]);
  const speaking = (language: Language) => posts.filter((post) => post.language === language).length;
  const expecting = (result: Expectation["result"]) => posts.filter((post) => post.expected.result === result).length;
  const languages = (Object.keys(LANGUAGES) as Language[]).map((language) => `${speaking(language)} ${LANGUAGES[language]}`);

  const lines = [
    "Extraction accuracy on the evaluation set",
    "",
    `${counted(posts.length, "post")}: ${languages.join(", ")}`,
    `Expected: ${counted(expecting("offer"), "offer")}, ${counted(expecting("demand"), "demand")}, ${expecting("not_housing")} not about housing`,
    set.reviewed ? "Expected facts confirmed by the site owner." : "Expected facts drafted, not yet confirmed by the site owner.",
    postsOf.size > 0 ? "Read by:" : "Read by no model.",
    ...[...postsOf].map(([model, numbers]) => `  ${model}: ${counted(numbers.length, "post")} (${numbered(numbers)})`),
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
    const differing = differences.map((d) => `${d.field}: expected ${d.expected}, extracted ${d.extracted}`).join("; ");
    lines.push(`#${post.n} [${post.language}, ${readBy.get(post.n)}] ${differing}`, `    ${post.url}`);
  }
  if (scores.unread.length > 0) {
    lines.push("", `Not read by any model, and in no score: ${scores.unread.map((post) => `#${post.n}`).join(", ")}`);
  }
  return lines.join("\n");
}
