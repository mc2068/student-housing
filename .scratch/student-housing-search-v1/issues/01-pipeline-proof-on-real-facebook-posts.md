# 01: Pipeline proof on real Facebook posts

**What to build:** The site owner runs one command and gets a review table of real posts from the public Facebook groups next to the facts extracted from each, plus a count of offers, demands, unrelated posts and dropped posts. It is run twice: a smoke run of about 25 posts from one group to confirm the managed scraper can read these groups logged-out at all, then a full run of about 100 posts from each of three groups. The ticket ends with a recorded go/no-go on Facebook collection (ADR 0001).

An early scaffold of collection and extraction exists and has never been run against the real services. The owner's keys are in a git-ignored local environment file; the scaffold must read that file and the variable names used there.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The command reads the keys from the owner's local environment file without any key appearing in output, logs or the repository
- [x] The smoke run returns real posts from one public group, collected without any Facebook account
- [x] The full run writes a review table with one row per post: result, kind, price, neighbourhood, size, furnished, gender restriction, the post text with phone numbers masked, and the link
- [x] The run prints counts per result
- [x] No author name, profile link or image is stored or written to the table
- [x] Post text sent to the model has phone numbers stripped
- [x] The scraping credit used per 1,000 posts is measured from the scraping account and recorded
- [x] The share of posts that are real offers is recorded
- [x] A go/no-go on Facebook collection is recorded in this ticket's comments; on no-go, ADR 0001 is reopened with the owner before any blocked ticket starts
- [x] If the smoke run shows the scraper's real input or output differs from what was assumed, the adapter and its saved sample are corrected to match

## Comments

### 2026-10-04 — smoke run done, full run not yet run

**Result: collection and extraction both work. Go/no-go is with the owner because of volume, not feasibility.**

- The scraper first chosen (a third-party "no login" scraper) returns nothing on Apify's free plan: it needs Apify Proxy, which the free plan blocks, and without a proxy Facebook rate-limits it. Replaced by Apify's own Facebook Groups Scraper, which works on the free plan with no Facebook account.
- Smoke run on the largest group: 25 posts requested, 25 returned, 21 with text (4 were image-only and are skipped).
- Extraction of the 21: 13 offers, 5 demands, 3 not about housing. Read by hand, all 21 results look right, every offer got a neighbourhood, and every phone number was masked. Edge cases seen: a short-stay rental counted as an offer; one post offering two rooms at two prices (the lower was taken); the same flat posted twice within minutes.
- Measured cost: $0.005 per post, plus $0.002 per post when the scraper's date filter is used. The date filter has been removed; posts come newest first and a post limit bounds the cost. At $0.005 the free $5 credit covers about 1,000 posts a month, about 33 a day across all groups.
- Measured volume: the largest group alone had about 170 posts a day (25 posts in 3.5 hours on a Sunday afternoon in October). The free credit therefore covers a small sample of what is posted, not all of it.
- Gemini: the model first chosen is closed to new users, and the current Flash model was overloaded for over a minute. Extraction now tries three Flash models in order with a short retry.
- Collected posts are now saved before extraction, so a failed extraction no longer wastes paid posts.
- Apify credit used so far this month: $0.23 of $5.

### 2026-10-04 — sample run across all six groups (replaces the full run, agreed with the owner)

40 posts were collected from each of the other five groups, on top of the 25 from the smoke run: 225 posts paid for, $1.23 of the $5 credit used in total.

| Group | Paid for | Usable | Offers | Offers per post paid | Rough posts per day |
|---|---|---|---|---|---|
| COLOCATION TUNIS (1610063532653404) | 25 | 25 | 14 | 56% | 130 |
| COLOCATION TUNIS (997925531076238) | 40 | 40 | 16 | 40% | 9 |
| Location et collocation (pour les étudiants) toute la Tunisie | 40 | 0 | 0 | 0% | 0 |
| ARIANA - location & co-location | 40 | 32 | 8 | 20% | 280 |
| COLOCATION FILLES TUNIS | 40 | 32 | 15 | 38% | 17 |
| منازل للكراء لطلبة في تونس | 40 | 32 | 16 | 40% | 39 |

- 69 offers from 161 usable posts (43%), and from 185 posts paid for in the five live groups (37%). The rest: 48 not about housing, 24 demands, 20 dropped for naming no curated neighbourhood.
- The "pour les étudiants toute la Tunisie" group is dead to a logged-out reader: its newest post is from June 2025. Removed from the source list.
- Many posts are shares whose own text is empty; the adapter now reads the shared post's text. Posts still unusable are image-only.
- Of the 69 offers: 20 flatshares and 49 rentals; 52% state a price, 64% a size, 62% furnished or not, 30% a gender restriction.
- Repeats: 61 distinct texts among the 69 offers. Agents repost the same offer within hours.
- The 20 dropped for no neighbourhood are mostly real offers in places the curated list lacks (Jaafar, Ennkhilette, Jardins d'El Menzah) or named only by a street or landmark (rue de Canada, Mohamed V, hôtel El Mechtel). Adding these to the neighbourhood list would recover most of them.
- Rejections read by hand look right: fridges, offices, movers, a villa for sale, people looking for a room.
- Gemini's free tier allows 20 requests a day per model on the larger Flash models. At 10 posts a request that is 200 posts a day per model, enough for daily collection but easily spent by reruns. Extraction now keeps finished results, sends only missing posts, and moves to the next model on a spent quota.
- Volume against budget: the five live groups see very roughly 470 posts a day; the free credit buys about 33 a day. At 37–40% offers that is about 400 Facebook listings a month, so roughly 200 visible at any time under the 14-day window.

**Recommendation to the owner: go, as a sample.** Collection without a Facebook account works, extraction is good, and no personal data is kept. The free credit gives a useful sample of each group, not full coverage. Full coverage needs a paid plan or the home-machine scraper from ADR 0001.

### 2026-10-04 — owner's decision: GO

The owner decided to go ahead with Facebook collection as a sample of each group, inside the free credit. ADR 0001 stands. Tickets 02 and 03 are unblocked.

The owner also asked for the neighbourhood gaps to be filled. Added Jaafar, Ennkhilette and Jardins d'El Menzah as neighbourhoods (mapped to SUP'COM, and the last two also to ISI), and street and landmark spellings for Lafayette (rue du Canada), Centre Ville (avenue Mohamed V) and Belvédère (El Mechtel, Ouled Haffouz). The three street and landmark placements are a best guess and are worth a check by the owner.

The 20 dropped posts were extracted again with the larger list: 15 became offers. Final count is 84 offers from 161 usable posts (52%), or 45% of the 185 posts paid for in the five live groups. The 5 still dropped name no place at all, or one not on the list (Chedli Kalela, "proche Champion").

### 2026-10-04 — proof command retired

After ticket 03, the proof command duplicated the collection run and was removed in the code-review fixes. Its saved posts are kept as a replay file for the collection run (`npm run collect -- --replay proof/posts.json`), rebuilt with the corrected phone masking. The review table is kept as it was.
