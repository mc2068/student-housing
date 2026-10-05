// Measures extraction against the evaluation set: real posts, each with the facts a person expects.
// Not a test: a model's answers vary. Run it by hand whenever the prompt or the models change.
// The key comes from .env.collect: GEMINI_API_KEY, and optionally GROQ_API_KEY.
//   npm run evaluate                      every post through the models: one request per 10 posts
//   npm run evaluate -- --keep-answers    keeps the answers of the last run and sends only the posts without one;
//                                         after expected facts are corrected, it scores again at no model cost
// It reads proof/evaluation-set.json and writes, next to it, the answers, the scores it prints and a
// page to review the expected facts. All of it holds post texts and is never committed (docs/adr/0002).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
// The batch and the pause of a collection run, so extraction is measured as it is used.
import { BATCH_SIZE, errorLine, PAUSE_MS } from "../collect";
import { neighbourhoods } from "../data";
import { type Extractor, isUnreadable, type ReadExtraction } from "../domain";
import { reviewPage } from "./evaluation/review-page";
import { score } from "./evaluation/score";
import { formatScores } from "./evaluation/scores-text";
import { parseEvaluationSet } from "./evaluation/set";
import { withFallback } from "./extractor";
import { configuredExtractors, lastResortExtractors } from "./models";

const SET = "proof/evaluation-set.json";
const ANSWERS = "proof/evaluation-answers.json";
const SCORES = "proof/evaluation-scores.txt";
const REVIEW = "proof/evaluation-review.html";

/** A model's answer for one post, kept by the post's link. */
type Answers = Record<string, { readBy: string; extraction: ReadExtraction }>;

if (!existsSync(SET)) throw new Error(`${SET} is missing. It is not in the repository: copy it from the site owner's machine.`);
const set = parseEvaluationSet(readFileSync(SET, "utf8"), new Set(neighbourhoods.map((n) => n.id)));

const keepAnswers = process.argv.includes("--keep-answers");
const answers: Answers = keepAnswers && existsSync(ANSWERS) ? (JSON.parse(readFileSync(ANSWERS, "utf8")) as Answers) : {};

// The chain says which models it holds, not which one answered a batch: each model leaves its name here when it has.
let answeredBy = "";
const leavingItsName = (extractor: Extractor): Extractor => ({
  name: extractor.name,
  async extract(texts) {
    const results = await extractor.extract(texts);
    answeredBy = extractor.name;
    return results;
  },
});

const unread = set.posts.filter((post) => !answers[post.url]);
if (unread.length > 0) {
  // Every model a collection run may use, the last-resort ones after the others: the scores say who read what.
  const extractor = withFallback([...configuredExtractors(), ...lastResortExtractors()].map(leavingItsName));
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
      console.error(`Posts #${batch.map((post) => post.n).join(", #")} could not be read: ${errorLine(err)}`);
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
const text = formatScores(set, scores, readBy);
writeFileSync(SCORES, `${new Date().toISOString().slice(0, 10)}\n${text}\n`);
writeFileSync(REVIEW, reviewPage(set, scores));

console.log(text);
console.log(`\nSaved as ${SCORES}. To check the expected facts, open ${REVIEW} in a browser.`);
