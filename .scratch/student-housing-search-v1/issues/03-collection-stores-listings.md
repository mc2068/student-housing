# 03: Collection stores listings

**What to build:** A collection run turns posts from the Facebook source into listings stored in a local database, and prints what it did. This is the collection seam of the spec: raw posts in, stored listings out. Sources and the extractor sit behind their interfaces so the run can be tested with saved sample posts and canned model answers against a real local SQLite database.

**Blocked by:** 01

**Status:** done

- [x] A listing is stored with the link to its post, its source, kind, price, neighbourhood, size, furnished, gender restriction, a short excerpt, the post date and the collection date
- [x] Demands and posts not about housing are not stored
- [x] A post naming no known neighbourhood, or one the model invents, is not stored
- [x] An offer without a price is stored with no price
- [x] Collecting the same post again updates its listing and creates no second one
- [x] Stored excerpts contain no phone numbers, and no author identity or image is stored
- [x] Text handed to the extractor has phone numbers stripped
- [x] When the first model fails, the fallback model is used and the run completes
- [x] One source failing does not stop the others, and the failure is reported
- [x] The run prints counts of offers, demands, unrelated posts and dropped posts
- [x] Tests at the collection seam cover each criterion above with fake sources and a fake extractor; no test calls a live service
- [x] Earlier scaffold tests that sit below the seam are kept where they still fit and otherwise moved up to it

## Comments

### 2026-10-04 — done

- A collection run is one command. It reads the newest posts of each of the five Facebook groups, or replays posts saved earlier at no scraping cost, and writes listings to a local SQLite database.
- Verified three ways: 16 tests at the collection seam (fake sources, canned model answers, a real in-memory SQLite database); a replay of the 161 saved posts through the real models, giving 82 listings; and one small live run (two newest posts per group, about $0.04) that added 3 more.
- **One criterion is met differently from how it was written.** "Collecting the same post again updates its listing" became: a post already read is recognised by its link and skipped, so it is not sent to a model again. The free model quota is 20 requests a day on the larger models, and a daily run sees mostly posts it has already read. The store still updates a listing if the same link is ever recorded again. The spec is updated to say this.
- Posts older than 14 days are skipped before extraction; they could never be shown.
- A post no model could read is not remembered, so the next run tries it again. This was seen working: ten posts failed in one run and were read in a later one.
- Found on the way: the smaller Gemini models sometimes answer with a bare list instead of the wrapped object. The answer reader accepts both.
- The report shows, per source: collected, expired, already seen, offers, demands, not housing, no neighbourhood, unreadable, and the reason when a source or the models failed.
- The Facebook group list now gives each group an identifier and a name, so a listing's source can be shown on the site.
- Earlier tests of the model-answer reader and the prompt were replaced by seam tests. Tests of phone masking, the curated data and the Facebook adapter's mapping were kept.
- Not done here, by design: hidden listings (ticket 06) and the hosted database (tickets 09 and 10).

### 2026-10-04 — fixes after the two-axis code review

Every finding of the review was addressed. What changed:

- **Phone masking rewritten.** It now covers Latin, Arabic-Indic and Eastern Arabic-Indic digits; spaces, dots, dashes, slashes and brackets, up to three in a row; and Tunisian and international prefixes. A price or size written next to a number is kept ("prix 400 22 333 444" keeps 400). When a run of digits cannot be told apart, all of it is masked. 34 tests cover it.
- **A garbled model entry is no longer remembered as a rejection.** An entry that does not say whether the post is an offer is unread and tried again.
- **Extracted facts are bounded.** A price outside 30 to 20,000 dinars, or a size above S+10, is stored as not stated; a fractional price is rounded.
- **The post limit is validated.** `--posts` must be a whole number from 1 to 50, so a mistyped value cannot remove the cost limit.
- **Tests that could not fail were replaced.** The phone test and the author test now use an extractor with no model behind it and check what it receives and everything the database holds. Removing the masking, or the garbled-entry rule, makes a test fail (checked).
- **Saved samples.** The Facebook adapter is tested against the structure of real scraper output with made-up values; the Gemini client against a real saved answer. The Groq client is tested against the documented shape only, since no key was available.
- **New tests:** the same link from two sources in one run; a listing recorded twice.
- **Vocabulary.** The folder is `collection`; report counts and stored outcomes say "listing"; the fact is `genderRestriction`; a faculty has a `campus`; the retry helper is no longer called `post`; the package is named `student-housing-search`. "Kind" is in the glossary.
- **Structure.** Model clients, fallback and HTTP retry are separate files; outcome counting cannot silently miscount a new outcome; the listing's columns are listed once; `collected_posts.outcome` has a CHECK constraint; unused fields and environment overrides are gone.
- **The proof script was removed.** It duplicated the collection run and kept full post texts. Ticket 01 is closed and its saved posts remain as a replay file. ADR 0002 now records the one exception: masked post texts may be kept in local, uncommitted working files.
- **Kept on purpose:** the small database interface in `db/`. The review called it unasked for, but the spec puts tests on local SQLite and the hosted database on D1, so the SQL has to be written against something both can serve. The D1-specific parameter chunking was removed. `short` stays in the faculty data for the selector in ticket 04.
- The saved posts and the local database were rebuilt from the scraper's stored results with the new masking: 168 posts, 79 listings, no run of eight or more digits left in either.
