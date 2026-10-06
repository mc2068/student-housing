# 02: Extraction accuracy evaluation

**What to build:** The site owner can measure how well extraction works. About 50 real posts from the pipeline proof are kept as an evaluation set, each with the facts a person would expect (offer or not and why, kind, price, neighbourhood, size, furnished, gender restriction). One command runs extraction over the set and reports accuracy per field and how many demands were correctly rejected. It is a manual evaluation to re-run whenever the prompt or model changes, not an automated test, since a model's answers vary.

**Blocked by:** 01

**Status:** done

- [x] The evaluation set holds about 50 real posts covering offers, demands and unrelated posts, in French, Arabic and Tunisian Arabic in Latin letters
- [x] Posts in the set have phone numbers masked and carry no author identity
- [x] The expected facts are drafted for the owner and confirmed or corrected by the owner
- [x] One command reports accuracy per field and the demand-rejection rate
- [x] The command names each post where extraction and expectation differ, so the prompt can be improved
- [x] The first scores are recorded in this ticket's comments
- [x] The evaluation is kept out of the automated test run

## Comments

### 2026-10-05 — built and run once; the expected facts wait for the owner

**What the owner can now do.** `npm run evaluate` sends the 50 posts of the evaluation set through the same chain of models as a collection run (5 requests) and prints accuracy per field, the demand-rejection rate, and every post where extraction and expectation differ, with the model that read it. `npm run evaluate -- --keep-answers` scores the answers of the last run again without calling a model: this is the one to use after correcting expected facts.

**The set.** 50 posts from the pipeline proof, no text twice: 27 offers (14 rentals, 13 flatshares; one names no place), 12 demands, 11 not about housing (offices and a café to let, sales, movers, a job, a fridge, two lets by the night). 28 are in French, 12 in Arabic, 10 in Tunisian Arabic in Latin letters; many mix two. It was chosen for variety and holds hard posts on purpose, so its scores are not the accuracy on an ordinary day's posts.

**Where it lives.** `proof/evaluation-set.json`, in the main checkout. It holds post texts, so it is not committed (ADR 0002); the command, the scoring and 19 tests of the scoring (on made-up posts) are. The command refuses a set whose text still holds a phone number, or whose posts carry any field besides number, language, link, text, expected facts and note.

**First scores** (2026-10-05, prompt unchanged since ticket 03, expected facts not yet confirmed):

| | Right | Share |
|---|---|---|
| Offer, demand or not housing | 47/50 | 94% |
| — offers recognised | 26/27 | 96% |
| — demands rejected | 12/12 | 100% |
| — not-housing posts rejected | 10/11 | 91% |
| Neighbourhood | 26/26 | 100% |
| Kind | 25/25 | 100% |
| Price | 24/25 | 96% |
| Size | 24/25 | 96% |
| Furnished | 23/25 | 92% |
| Gender restriction | 25/25 | 100% |

The neighbourhood is scored on posts both sides call an offer; the other facts on posts that came back as a listing. All 50 posts were read.

- Read by: gemini-3.8-flash 30 posts, gemini-3.6-flash 10, gemini-3.5-flash-lite 10. The first request fell through the three larger models to the lite one; why was not looked into, to stay inside the request budget.
- **Six of the seven differing posts are among the ten the lite model read** (#1, #4, #5, #7, #8, #10): a flatshare written as "looking for a girl to share my room" read as a demand; the higher of two prices taken; "furnished" stated where the post does not say, twice; a size not worked out from "3 bedrooms and a living room"; a demand given the reason "not housing" (still rejected).
- The larger models differ on one post in forty (#19): a flat let by the day came back as a rental, with no price. The other by-the-night post (#43) was rejected. The prompt has no rule for short stays, so the models decide either way.
- No demand became a listing.
- Caution: one run, and answers vary. The expectations were drafted by an agent that had seen the earlier extraction results, so agreement may flatter the models until the owner has checked them.

**What the owner should do** (criterion 3):

1. Open `proof/evaluation-review.html` in a browser (double-click it). One row per post: its text, the expected facts, a note where a reader could hesitate, and what the models answered differently.
2. Decide the cases the draft could not: lets by the night (#19, #43), drafted as not housing; posts with two prices (#4, #9), where the lower is expected; "for students only" (#41), drafted as no gender restriction; "S+1" that also says two separate bedrooms (#14), drafted as S+1; "the house has 3 rooms" (#45), drafted as S+3.
3. To correct a post, change its `expected` in `proof/evaluation-set.json` (same number `n`), or give an agent the numbers and the corrections. Values: `result` is `offer`, `demand` or `not_housing`; `kind` is `rental` or `flatshare`; `price` and `size` are a number or `null`; `neighbourhood` is an id from `data/neighbourhoods.json` or `null`; `furnished` is `true`, `false` or `null`; `gender` is `girls`, `boys` or `unspecified`. A demand or a not-housing post has only its `result`. A typo is refused with the post's number.
4. Set `"reviewed": true` at the top of that file and run `npm run evaluate -- --keep-answers`. Replace the scores above with the new ones and tick the criterion.

**Decided.**

- The review is a page and not a table for a spreadsheet: long posts and Arabic read badly in cells, and a comma-separated file opens in one column on a French Windows.
- A post dropped for naming no listed neighbourhood counts as "read as an offer"; its other facts are lost with the neighbourhood and are not scored.
- A demand counts as rejected when the model did not take it for an offer, whatever reason it gave; the wrong reason still counts against "offer, demand or not housing".
- A post no model could read is named and left out of every score.
- The list of models in use moved to one place (`collection/extract/models.ts`) that the collection run and the evaluation share, so the evaluation cannot drift from what collection uses.

**Left.**

- The owner's confirmation (above).
- The prompt was not changed here, as agreed. What the first run suggests for whoever changes it next: a rule for lets by the day or night, a rule for two prices in one post, and an example of an offer written as "looking for someone to share". No ticket covers this yet.
- Whether a batch should ever reach the lite models, given how they did here, is a question for the daily collection (ticket 10) once the scores are confirmed.

### 2026-10-05 — fixes after the two-axis code review

The review covered tickets 02, 09 and 10 together. The scores do not change: the 50 saved answers scored again give the same figures, and the review page is the same to the byte.

**What changed for the owner**

- **The output names the model that read each post**, as the spec says it does. It used to give a count per model, and the model only for the posts that differ. It now lists the posts of each model:

  ```
  Read by:
    gemini:gemini-3.5-flash-lite: 10 posts (#1 to #10)
    gemini:gemini-3.8-flash: 30 posts (#11 to #30, #41 to #50)
    gemini:gemini-3.6-flash: 10 posts (#31 to #40)
  ```

  This was the more useful way to make the two agree: the finding above, that six of the seven differing posts are among the lite model's ten, can now be read off the output.
- **The saved text is `proof/evaluation-scores.txt`**, no longer `proof/evaluation-report.txt`. In this project a report is the email about a listing (`CONTEXT.md`), so the scores are called scores, in the code and in the README. The old file in the main checkout is left over from the first run and can be deleted; the next `npm run evaluate -- --keep-answers` writes the new one.

**What changed in the code**

- The one file of 327 lines is four, one per reason to change, in `collection/extract/evaluation/`: reading and checking the set (`set.ts`), scoring (`score.ts`), the scores as text (`scores-text.ts`), the review page (`review-page.ts`). The command stays at `collection/extract/evaluate.ts`.
- The batch size, the pause and the shortening of an error message are taken from the collection run, which had them first.
- Names: a tally counts `right` out of `total`; the wrapper that remembers which model answered says so.

**Left as it is, and why**

- **The keys of the set file**: `n`, `gender`, `neighbourhood`, where the code elsewhere says `genderRestriction` and `neighbourhoodId`. The set is the owner's working file and is under review now; renaming its keys in the middle of that is not worth it. The review asked for `n` to be renamed in the code; it is the same key of the same file, read as it is written, so it stays for the same reason.
- **`--keep-answers` and the review page.** Not in the criteria, but they are how the third criterion gets met: the owner reads the page, corrects the file, and scores again at no model cost.

**How it was checked**

- 20 tests of the reading, the scoring, the text and the page pass, on made-up posts.
- `--keep-answers` on a copy of the set and its 50 saved answers, with no key in the environment so that no model could be called: the same scores as the first run, line for line apart from "Read by"; the review page identical.

### 2026-10-06 — expected facts confirmed by the owner

The site owner looked at the review page and confirmed the expected facts as drafted, including the doubtful cases listed above (lets by the night as not housing, the lower of two prices, "for students only" as no gender restriction). The set is marked as reviewed and was scored again from the saved answers, with no model call: the scores are the first ones, unchanged (47/50 on offer, demand or not housing; 12/12 demands rejected; neighbourhood 26/26, kind 25/25, price 24/25, size 24/25, furnished 23/25, gender restriction 25/25).
