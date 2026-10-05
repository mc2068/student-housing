// Measures extraction against the evaluation set: real posts, each with the facts a person expects.
// Not a test: a model's answers vary. Run it by hand whenever the prompt or the models change.
// The key comes from .env.local: GEMINI_API_KEY, and optionally GROQ_API_KEY.
//   npm run evaluate                      every post through the models: one request per 10 posts
//   npm run evaluate -- --keep-answers    keeps the answers of the last run and sends only the posts without one;
//                                         after expected facts are corrected, it scores again at no model cost
// It reads proof/evaluation-set.json and writes, next to it, the answers, the report it prints and a
// page to review the expected facts. All of it holds post texts and is never committed (docs/adr/0002).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { neighbourhoods } from "../data";
import { type Extractor, isUnreadable, type ReadExtraction } from "../domain";
import { formatReport, parseEvaluationSet, reviewPage, score } from "./evaluation";
import { withFallback } from "./extractor";
import { configuredExtractors } from "./models";

const SET = "proof/evaluation-set.json";
const ANSWERS = "proof/evaluation-answers.json";
const REPORT = "proof/evaluation-report.txt";
const REVIEW = "proof/evaluation-review.html";

// The batch and the pause of a collection run (collection/collect.ts), so extraction is measured as it is used.
const BATCH_SIZE = 10;
const PAUSE_MS = 5000;

/** A model's answer for one post, kept by the post's link. */
type Answers = Record<string, { readBy: string; extraction: ReadExtraction }>;

if (!existsSync(SET)) throw new Error(`${SET} is missing. It is not in the repository: copy it from the site owner's machine.`);
const set = parseEvaluationSet(readFileSync(SET, "utf8"), new Set(neighbourhoods.map((n) => n.id)));

const keepAnswers = process.argv.includes("--keep-answers");
const answers: Answers = keepAnswers && existsSync(ANSWERS) ? (JSON.parse(readFileSync(ANSWERS, "utf8")) as Answers) : {};

// The chain says which models it holds, not which one answered a batch: each model notes it here.
let answeredBy = "";
const noting = (extractor: Extractor): Extractor => ({
  name: extractor.name,
  async extract(texts) {
    const results = await extractor.extract(texts);
    answeredBy = extractor.name;
    return results;
  },
});

const unread = set.posts.filter((post) => !answers[post.url]);
if (unread.length > 0) {
  const extractor = withFallback(configuredExtractors().map(noting));
  for (let start = 0; start < unread.length; start += BATCH_SIZE) {
    if (start > 0) await sleep(PAUSE_MS);
    const batch = unread.slice(start, start + BATCH_SIZE);
    try {
      const extractions = await extractor.extract(batch.map((post) => post.text));
      for (const [i, post] of batch.entries()) {
        const extraction = extractions[i];
        if (extraction && !isUnreadable(extraction)) answers[post.url] = { readBy: answeredBy, extraction };
      }
    } catch (err) {
      const reason = (err instanceof Error ? err.message : String(err)).replace(/\s+/g, " ").slice(0, 200);
      console.error(`Posts #${batch.map((post) => post.n).join(", #")} could not be read: ${reason}`);
    }
  }
  // A run in which every model failed keeps the answers of the run before it.
  if (Object.keys(answers).length > 0) writeFileSync(ANSWERS, JSON.stringify(answers, null, 2));
}

const readBy = new Map<number, string>();
for (const post of set.posts) {
  const model = answers[post.url]?.readBy;
  if (model) readBy.set(post.n, model);
}

const scores = score(set.posts, set.posts.map((post) => answers[post.url]?.extraction));
const report = formatReport(set, scores, readBy);
writeFileSync(REPORT, `${new Date().toISOString().slice(0, 10)}\n${report}\n`);
writeFileSync(REVIEW, reviewPage(set, scores));

console.log(report);
console.log(`\nSaved as ${REPORT}. To check the expected facts, open ${REVIEW} in a browser.`);
