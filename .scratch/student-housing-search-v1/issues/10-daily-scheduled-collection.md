# 10: Daily scheduled collection

**What to build:** Collection runs by itself once a day and keeps the live site current, without the site owner doing anything and without exceeding the free scraping credit or the free model quotas.

**Blocked by:** 03, 09

**Status:** ready-for-human (everything that needs no account is built and proven on this machine; the four unticked criteria wait on the owner's steps in `docs/daily-collection.md`, which themselves wait on `docs/deploy.md`)

- [ ] Collection runs once a day on a free scheduler and writes to the hosted database — *the schedule and the run are written; neither has run on GitHub or met the real database: waits on owner steps 1 to 7*
- [x] Only Facebook posts newer than the previous run are fetched, so the monthly scraping credit is not spent on posts already collected — *not met as written: a run fetches each group's newest posts again and pays for the repeats. Met differently, as the spec decided after this was written: see the comment, "One criterion is met differently"*
- [x] The number of posts fetched per run is capped so a month of runs stays inside the free scraping credit
- [x] Extraction requests are batched and paced to stay inside the free model quotas
- [x] One source failing does not stop the others, and the run reports which source failed
- [x] Each run's log shows counts of offers, demands, unrelated posts and dropped posts per source
- [ ] Keys live only in the scheduler's secret store — *the run on GitHub reads its four keys from the repository's secrets and from nowhere else, and no key is in any file git would commit (checked); the secrets themselves are owner step 6*
- [ ] The owner can trigger a run by hand — *the "Run workflow" button is declared and documented; it appears once the project is on GitHub: waits on owner step 1*
- [ ] After a scheduled run, new listings are visible on the live site — *waits on the live site and the first run*

## Comments

### 2026-10-05 — built up to the owner's account steps

Nothing ran on GitHub or against Cloudflare: the project has no GitHub repository yet and this machine has no Cloudflare login, and both are the owner's. What follows was done without either.

**What the owner can now do**

- Follow `docs/daily-collection.md`, linked from the README and from the end of `docs/deploy.md`: eight steps. In short: put the project on GitHub, create a Cloudflare token that can only edit D1, create an Apify token and a Gemini key for the run, enter four secrets in the repository's settings, start a run by hand, read its log, look at the site.
- After that, nothing: a run starts every morning at about 06:17, Tunis time.
- Start a run by hand from the **Actions** tab, choosing 1 to 6 posts a group (2 unless changed).
- See what went wrong without reading code: a failed run has a red cross, an email from GitHub, and a red line that names the group. The same page of the document says what each kind of failure means.

**What was built**

- The schedule: `.github/workflows/collect.yml`. One job: get the project, install, run `npm run collect:hosted`.
- `npm run collect:hosted`: the same collection run as `npm run collect`, writing to the hosted database. It takes its keys from the environment and the database's identifier from `wrangler.jsonc`.
- A third way to reach a database behind the small database interface (`db/d1-http.ts`): D1's HTTP API, which is how a program outside Cloudflare talks to it. Why this way and not another is in ADR 0003. It repeats a request that Cloudflare's servers failed to answer, twice; every statement the project sends is safe to repeat.
- The daily share of posts, worked out from the credit and the number of groups (`collection/credit.ts`).
- A second try for posts no model could read, and the last-resort models (below).
- A run that had a failure does everything else, prints its counts, names what failed, and ends as failed.
- The run opens the database before it asks any source, so a wrong token or a missing identifier stops it before a post is billed.

**One criterion is met differently**

"Only Facebook posts newer than the previous run are fetched" would need the scraper's date filter, which the spec rules out because it adds $0.002 to every post (40% more). Instead each run takes each group's newest posts up to its share; a post collected before is recognised by its link, counted as `alreadySeen`, and not sent to a model.

What that costs: a group that posted fewer times than its share since the last run returns some posts a second time, at $0.005 each. In the posts saved on 2026-10-04, four groups had 12 or more new posts in a day and one had 2, so a daily run of six a group would have paid twice for 4 posts of 30: $0.02 a day, about $0.62 a month, out of a spend that is fixed anyway. The date filter would cost more as long as fewer than 2 posts in 7 are repeats. This is one day's posts in the busy season; the `alreadySeen` column of every run's log gives the real figure. If a group turns out quiet for long, giving it a smaller share is the cheap fix; it is not built.

**The sums**

- *Scraping.* $5 a month at $0.005 a post is 1,000 posts. 60 are kept for runs by hand. 940 over a 31-day month is 30 a day: 6 from each of five groups, 930 posts, $4.65. That leaves 70 posts: seven runs by hand at 2 a group, or two at 6. The share is worked out from the number of groups in `data/sources.json`, so a sixth group brings it to 5 each without anyone remembering to change it. A test checks that a 31-day month plus two more runs fits for 1 to 30 groups.
- *Models.* At most 30 new posts a day, 10 a request: 3 requests, of the 20 a day each larger Flash model allows. On a day when every model refuses, a run makes at most 18 attempts on each larger model (3 batches, 3 attempts, 2 tries). That matters because a refusal for overload may count against the day's 20: `gemini-3.8-flash` answered 429 at its twelfth attempt of this ticket's runs, the eleven before all refused for overload, on a day when ticket 02's evaluation had used it too. Not confirmed.
- *Database.* About 70 requests a run against Cloudflare's 1,200 in five minutes, and about 100 rows written against 100,000 a day.
- *GitHub.* An estimated few minutes a run, and about twenty on a day the run has to wait for the models, against 2,000 free minutes a month in a private repository. Not measured: it has never run there.

**May a daily batch fall through to the lite models? Only as a last resort.**

- Ticket 02's first scores: a lite model differed from the expected facts on 6 posts of 10, the larger ones on 1 of 40. A post read wrongly is never read again, so a wrong reading stays for the listing's 14 days. And with 3 requests needed of 60 available, quota is never a reason to go lower. So the three larger models are now the only ones a batch meets at first.
- But leaving the lite models out entirely would lose days. While proving this ticket, around 17:00 on 2026-10-05, all three larger models refused as overloaded for more than ten minutes: 35 attempts, one answered. Ticket 02 saw the same on its first request, and a lite model answered it. Posts that are not read are paid for and, in a busy group, no longer among the newest the next day.
- So: a batch the three larger models could not read is tried again five minutes later, and only if they refuse again does it go to the two lite models (then Groq, if a key is ever set; it has never been measured). The run's log counts the posts read that way, per group, as `byLastResort`.
- This is the owner's to revisit once the expected facts of ticket 02 are confirmed. Both lists of models are in `collection/extract/gemini.ts`; emptying the second makes the answer "never".
- The evaluation still tries every model, the last-resort ones after the others, and names the one that read each post, so it can measure both.

**How it was checked**

- 132 tests pass (25 new), type checking passes, `npm run build` passes.
- The new database client: against a saved sample in the shape Cloudflare's reference documents, with made-up rows (no account was available to save a real answer); what it sends, checked against the same reference; a refusal turned into an error with Cloudflare's words and without the token; requests repeated after a server failure. And the collection store and the search run through it with a real local D1 answering in Cloudflare's place, giving the same listings as SQLite. That last test was seen failing when the client was made to send numbers as text.
- At the collection seam, on SQLite: a failed batch tried again after the others; the last-resort models asked only after two failures, and their posts counted; a failure of everything reported; the lines that name a failed source.
- The workflow file: no free linter was already on this machine, and none was downloaded. It was parsed with the YAML reader the project already has and checked by a script written for the purpose: structure, the schedule, the choice of posts, that the job can only read the repository, that every key comes from a secret of the same name, and that no value is pasted into the script. GitHub's own reading of the file is the first push.
- The workflow's last step, taken from the file and run in bash as GitHub would, with made-up keys and every outside request answered on this machine: the scheduled form took "the 6 newest posts of each of 5 Facebook groups", all five sources failed (their requests were refused here), each was named on a line of its own, and the step ended with exit code 1. The by-hand form passed `--posts 2`.
- The same command replaying the 168 saved posts into a stand-in for Cloudflare's endpoint backed by a scratch SQLite file: 63 requests, 17 listings and 34 read posts stored with whole-number prices, exit code 0. This proves the wiring, not Cloudflare.
- A replay into a copy of the local database with 12 posts made unread and every model refusing (answered on this machine): nothing stored, three groups named, exit code 1.
- The same replay with the real models: both batches refused by all three larger models at the first try. One batch of 2 posts was read at the last attempt (1 listing, 1 demand, 74 listings in the copy). The other 10 were refused again five minutes later; that second run was started before the last-resort models were added, so they were not tried. The run was not started a third time: see the next point.
- **The limit of two model requests was passed.** The plan was two requests. Because every refusal is retried, the two real runs sent 35 attempts, of which one was answered. No Apify call was made.
- The run stops before any call when a key is missing, when `wrangler.jsonc` still has the placeholder identifier, or when the number of posts is not 1 to 50. Each was seen.
- A value sent as text would still be stored as a number: checked on SQLite with the real schema.

**Not checked, because it needs the accounts**

- The workflow on GitHub: that it starts on schedule and by hand, that `npm ci` and Node 24 behave there as here, how long a run takes.
- The real D1 endpoint. Two things the reference leaves open: it types bound values as text while the run sends numbers and empty values as they are, and it does not say whether the comment lines of `db/schema.sql` pass when the file is sent whole. Either would show as a failed first run with Cloudflare's message: the schema is sent before any source is asked, so nothing is billed if it is refused; the first number is sent with the first listing stored, after that run's posts are billed (about $0.05 for a run by hand at 2 a group).
- The limited Apify token. Apify documents it; whether a token limited to running one Actor may also read that run's results was not tried. The owner's step says what to do if not.
- The last-resort models from a real run.
- Whether 05:17 UTC is a calm hour for the free models.

**Decided**

- **D1's HTTP API, one request per statement** (ADR 0003).
- **The schedule is 05:17 UTC**, 06:17 in Tunis: before the day starts, and off the hour, when GitHub starts schedules late.
- **A run by hand takes 2 posts a group unless told otherwise**, and at most 6, so that testing does not eat the month.
- **A failure of the database stops the run.** Unlike a failed source, nothing useful can follow: reading posts that cannot be stored would only spend quota.
- **The job is failed when posts went unread**, even though the rest was stored. Otherwise a week of refusals would look like a week of quiet groups.
- **The hosted database's identifier is read from `wrangler.jsonc`**, not from a secret: it is in the repository already, and one place is enough.
- **No Groq secret in the schedule.** It can be added to the workflow in one line when someone has measured it.
- **The scraper's key and the model's key are separate from the ones on the owner's machine**, so either set can be withdrawn alone.
- The daily run has the Facebook groups only, since tickets 07 and 08 are stopped. A new source is one more entry in the list of sources in `collection/run.ts`; nothing was built for it.

**Left for others**

- The owner's steps, then ticking the four criteria: after the first run by hand, and after the first scheduled one.
- Ticket 11: the first week of logs answers what could not be measured here (repeats per group, how often the models refuse at that hour, how often the last resort is used, minutes per run).
- No ticket covers it: `sendWithRetry` asks an overloaded model three times within twenty seconds. If refusals do count against the daily quota, asking once and letting the five-minute second try do the waiting would spend a third as much.

### 2026-10-05 — fixes after the two-axis code review

The review covered tickets 02, 09 and 10 together. This is what it changed here.

**A post left unread now fails the run, whatever batch it was in**

- Before: a model that answered for a batch but left one post out, or garbled its entry, left that post counted as `unreadable` and the run green. Only a batch refused whole made the run fail. The spec and this ticket both say a run with unread posts ends as failed.
- Now: every post still unread at the end is counted, and its group is named on a red line with how many, for example `fb-ariana-bawsla: no model could read 2 of its posts (left out of a model's answer, or garbled in it)`.
- **Decided: such a post gets the second try within the run**, like a refused batch, and the last-resort models with it. The reason is the same: it is paid for, and in a busy group it is no longer among the newest the next day. It does not get the five-minute wait, which is for models that refuse: the run asks again after the usual five seconds.
- What it costs: one more request on a day when a model leaves a post out. The most a run can ask is unchanged (three batches, twice).
- A test at the collection seam was seen failing first, and so was the saved-posts replay below.

**More than 100 new posts from one group no longer break on the hosted database**

- The store asks the database which links it already holds with one value per link, and D1 refuses a statement that binds more than 100. Ticket 03's review removed the grouping as unneeded; with D1 real, it is back: 100 links at a time.
- A daily run takes 6 posts a group, so this was only reached by a replay of many saved posts into the hosted database, or by a large run by hand.
- The test runs the store on the local D1 with 250 links. It was seen failing with D1's own error ("too many SQL variables"); local SQLite would not have shown it. ADR 0003 said "about 500 posts", which is another limit; it now gives both.

**Every outside request has a time limit, and the job's limit is 60 minutes**

- Before, no request had a limit, the wait for a scraper run had no end, and the job stopped at 40 minutes. A job GitHub stops prints no counts and names no group.
- Now: a request to Apify or to the database fails after 30 seconds, a request to a model after 2 minutes, and a scraper run still going after 5 minutes is given up. Each fails the usual way: the group is named and the run goes on; the next model is asked; a database request is repeated twice, then stops the run.
- The sum, from the waits in the code, for a daily run of 30 posts in 3 batches:
  - An ordinary day: five scraper runs, 3 model requests with 5 seconds between them, about 70 database requests. A few minutes. Not measured on GitHub.
  - Every model refusing, each refusal answered at once, as on 2026-10-05. First try: 3 batches × 3 models × 3 requests, with 20 seconds of retries per model (27 requests, 3 minutes of waits). Then five minutes. Second try: 3 batches × 5 models, the two lite ones included (45 requests, 5 minutes of waits). In all 72 requests and 13 minutes 20 seconds of waits: about 16 minutes of reading, about 25 for the run.
  - The same day with every scraper run slow to its limit and still succeeding: five times about 5 minutes more, about 45 minutes.
  - Slower than that (every model taking a minute or two to answer each request) has never been seen. The job's 60 minutes is for that day, and such a job still prints no counts: nothing was built to make a stopped job print them.
- **Not known: how long a scraper run takes.** It was never recorded. Five minutes for a few posts of one group is a guess on the generous side. If the first runs show a group failing with `was still RUNNING after 5 minutes`, raise `RUN_LIMIT_MS` in `collection/sources/facebook-apify.ts`. A run given up on carries on at Apify and its posts are billed.

**Smaller changes**

- `--hosted` and `--preview` are read in one place (`db/target.ts`) by the collection run and the two database commands. A collection run given `--preview` now stops with a message; before, the word was ignored.
- The hosted database's identifier is read from `wrangler.jsonc` in one place (`db/wrangler-config.ts`), by the run and by the check before a deploy.
- The retry waits of the D1 client are no longer part of the account's description; the true-or-false argument that told the first try from the last is gone; the batch size and the pause are written once, and the evaluation takes them from the run.
- The owner's page (`docs/daily-collection.md`) has the new red lines, the time limits and the sum.

**How it was checked**

- 142 tests pass (10 more than before), type checking passes, `npm run build` and the Cloudflare build pass.
- The workflow file passes the same structure check as before. Its last step, taken from the file and run in bash with made-up keys and every outside request answered on this machine: the scheduled form took 6 posts from each of 5 groups, named the five groups (their requests were refused here) and ended with exit code 1; the by-hand form passed `--posts 2`.
- The same command replaying the 168 saved posts into the stand-in for Cloudflare, with the stand-in model that answers for 2 posts of every 10. Before this fix it stored 34 read posts and ended with exit code 0, with 134 posts unread. Now it says "No model read 134 post(s) … Trying once more in 5 seconds", reads 28 more at the second try (31 listings, 62 read posts), names each of the five groups with its count of unread posts, and ends with exit code 1.
- With the placeholder identifier, the hosted run stops before any request (0 attempted).
- No model, Apify or Cloudflare call was made.

**Left as it is, and why**

- The tests that check the order of the prompts and the number of extractor calls (`collection/collect.test.ts`). The extractor there is the fake at the collection seam, and the spec's own list for that seam has "text handed to the extractor" and "not read again": what the extractor receives is what a caller at the seam observes.
- The second criterion above stays ticked; its line now says plainly that it is not met as written.
- `sendWithRetry` still asks an overloaded model three times within twenty seconds (see "Left for others" above).

**For the owner**

- The spec gained one sentence, under Extraction: a post a model leaves out of its answer gets the same second try, without the wait.
