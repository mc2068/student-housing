# Student housing search for Grand Tunis — v1

Status: ready-for-agent

## Problem Statement

A student starting or continuing studies in Tunisia has to find housing by hand. Offers are scattered across classified sites and many Facebook groups. None of these can be searched by faculty, most cannot be filtered by budget, and the Facebook posts are free text mixing French, Arabic and Tunisian Arabic in Latin letters. The student scrolls through hundreds of posts, many of them from other students who are also looking, many of them stale, to find the few offers that are near their faculty, within their budget, and open to them.

## Solution

A free French-language website, built for phones first, where a student picks their faculty and a few criteria and sees every matching listing from the last 14 days, newest first. Each listing shows the extracted facts (rental or flatshare, price and its price basis, neighbourhood, size, furnished, gender restriction, age, source) and links to the original post, where the student sees photos and contacts the author. The site never hosts contact itself.

Listings are collected once a day from Tayara, Mubawab and a short list of public Facebook groups for Grand Tunis, and turned into structured facts automatically.

## User Stories

1. As a student, I want to choose my faculty from a list, so that I only see listings in neighbourhoods near where I study.
2. As a student, I want the faculty list to include facultés, écoles and instituts alike, so that I can find mine whatever its type.
3. As a student, I want to search without creating an account, so that I can start looking immediately.
4. As a student, I want to choose between rentals, flatshares, or both, so that I see the kind of housing I am after.
5. As a student looking for a flatshare, I want to enter a per-person budget, so that I only see places I can afford on my own.
6. As a group of students looking for a rental, I want to enter a budget for the whole unit, so that I see units the group can afford together.
7. As a student, I want each price labelled "par personne" or "logement entier", so that I never mistake a whole-unit price for my share.
8. As a student, I want to leave a budget empty, so that I am not forced to set a limit for a kind of housing I am only browsing.
9. As a student, I want listings with no stated price shown as "prix non précisé" when I have set no budget, so that I do not miss offers whose author gives the price privately.
10. As a student who has set a budget, I want listings with no stated price hidden, so that my results respect my limit.
11. As a female student, I want to filter for housing open to girls, so that I do not waste time on boys-only offers.
12. As a male student, I want to filter for housing open to boys, so that I do not waste time on girls-only offers.
13. As a student who filtered by gender, I want listings with no stated gender restriction still shown and labelled as such, so that I do not lose most rentals, which rarely state one.
14. As a student, I want to filter by size (S+1, S+2, …), so that I find a unit that fits the number of people.
15. As a student, I want to filter by furnished or unfurnished, so that I only see housing I can actually move into.
16. As a student, I want to choose "furnished" and still be told when a listing does not say, so that I can decide whether to check the source.
17. As a student, I want results sorted newest first, so that I see the offers most likely to still be available.
18. As a student, I want each listing to show how long ago it was posted, so that I can judge whether it is still worth contacting.
19. As a student, I want listings older than 14 days to disappear, so that I am not chasing rooms that are gone.
20. As a student, I want each listing to show which source it came from, so that I know where the link will take me.
21. As a student, I want a link on every listing to its original post, so that I can see photos and contact the author there.
22. As a student, I want a short excerpt of the original post on each listing, so that I can sense what the author wrote before clicking through.
23. As a student, I want to see the neighbourhood of each listing, so that I can judge the commute myself.
24. As a student, I want posts from people who are themselves looking for housing left out, so that results contain offers only.
25. As a student, I want posts that are not about housing left out, so that results are not cluttered with group noise.
26. As a student, I want the site in French, so that I can use it in the language of university life.
27. As a student on a phone, I want the search form and results to work well on a small screen, so that I can search from anywhere.
28. As a student, I want a clear message when no listing matches, so that I know to loosen my criteria.
29. As a student, I want to report a listing that looks like a scam, so that it can be removed for others.
30. As a student, I want Facebook group offers and classified site offers in the same results, so that I search once.
31. As a post author, I want my name and profile left off the site, so that my identity is not republished.
32. As a post author, I want my phone number left off the site, so that it is only visible where I chose to post it.
33. As a post author, I want my photos not copied to the site, so that my images stay where I published them.
34. As a post author, I want a way to ask for my listing to be removed, so that I keep control over where my offer appears.
35. As a post author who had a listing removed, I want it to stay removed on later collections, so that I do not have to ask twice.
36. As a post author, I want students sent to my original post, so that contact happens where I expect it.
37. As the site owner, I want collection to run automatically every day, so that the site stays current without my intervention.
38. As the site owner, I want only new posts collected from Facebook, so that the free scraping credit lasts the month.
39. As the site owner, I want the Facebook group list kept as a plain data file, so that I can add or remove a group without touching code.
40. As the site owner, I want the faculty-to-neighbourhood map kept as a plain data file, so that I can correct it from local knowledge.
41. As the site owner, I want the neighbourhood list to carry spelling variants, so that posts written in different spellings and scripts are still recognised.
42. As the site owner, I want only public Facebook groups collected, without any Facebook account, so that no account can be banned and the collection stays on the defensible side of Facebook's terms.
43. As the site owner, I want posts that name no known neighbourhood dropped, so that every listing can be matched to a faculty.
44. As the site owner, I want a post collected twice to be recognised by its link and not read again, so that results contain no repeats of the same post and no model quota is spent on it.
45. As the site owner, I want extraction to fall back to a second free model when the first is over quota or down, so that a day's collection is not lost.
46. As the site owner, I want phone numbers stripped before post text is sent to any model, so that personal data is not passed to third parties.
47. As the site owner, I want to receive report emails that identify the listing, so that I can act on them quickly.
48. As the site owner, I want to hide a listing by hand, so that I can honour a removal request or drop a scam.
49. As the site owner, I want the whole service to run at no cost, so that I can keep it free for students.
50. As the site owner, I want the Facebook pipeline proven on real posts before the website is built, so that I learn early if the must-have source does not work within the free limits.
51. As the site owner, I want a review table of collected posts next to their extracted facts, so that I can judge extraction quality by hand.
52. As the site owner, I want a count of offers, demands, unrelated posts and dropped posts after each collection, so that I can see what the sources are yielding.
53. As the site owner, I want one failing source not to stop the others, so that a broken scraper costs one source for a day and not the whole collection.
54. As a maintainer, I want every source behind the same interface, so that a source can be replaced or added without touching the rest.
55. As a maintainer, I want the extraction model behind one interface, so that the free provider can be swapped when quotas change.
56. As a maintainer, I want the search rules tested against a real database, so that the rules that are easy to get wrong stay correct.

## Implementation Decisions

**Shape**

- A pure aggregator. No accounts, no direct posting, no photos, no messaging. Contact happens on the source.
- Two parts: a daily collection job and a website. They share one database and one definition of a listing.
- TypeScript throughout. The website is a Next.js application on Cloudflare Workers; the database is Cloudflare D1; the collection job runs on a daily GitHub Actions schedule.
- Running cost is zero. Every service must fit its free tier.

**Sources**

- V1 sources: Tayara, Mubawab, and 5–8 hand-picked public Facebook groups for Grand Tunis.
- Every source is an adapter with the same interface: it returns raw posts, each with a source identifier, the post's link, its text, and its post date. An adapter never returns author identity or images (ADR 0002).
- Facebook is collected logged-out, from public groups only, through Apify's own Facebook Groups Scraper inside the free $5 monthly credit (ADR 0001). Measured in the pipeline proof: $0.005 per post, so the credit covers about 1,000 posts a month, while the largest group alone sees about 170 posts a day. Each run takes the newest posts up to a limit; posts already collected are recognised by their link. The scraper's date filter is not used, as it adds $0.002 per post.
- Tayara and Mubawab are collected by small adapters of our own that read the sites' rental listings for Grand Tunis. Their listings are already structured, so price, size and kind come from the page; only the location needs mapping to a neighbourhood.
- One source failing does not stop the others.

**Extraction**

- An extractor takes a batch of post texts and returns, for each, either the listing facts or a rejection with a reason: demand, not housing, no neighbourhood, or unreadable.
- Listing facts: kind (rental or flatshare), monthly price in dinars or none, neighbourhood, size (the n in S+n, studio is 0) or none, furnished (yes, no or not stated), gender restriction (girls, boys or unspecified).
- The price basis follows the kind: per person for a flatshare, whole unit for a rental.
- The extractor is a free-tier language model: a chain of Gemini Flash models tried in order, with Groq Llama as an optional last fallback. All sit behind the same interface. Measured in the pipeline proof: the larger Flash models allow 20 free requests a day each, so ten posts go in one request, finished extractions are never sent again, and a spent quota moves the batch to the next model.
- The model chooses the neighbourhood from the curated list only. An answer naming an unknown neighbourhood is treated as no neighbourhood, and the post is dropped.
- Phone numbers are stripped from post text before it is sent to a model and before an excerpt is stored. Masking covers Latin and Arabic digits, any common separator, and Tunisian and international prefixes. A price written next to a number is kept; when the two cannot be told apart, both are masked.
- An extracted price outside 30 to 20,000 dinars, or a size above S+10, is treated as not stated. A model entry that does not say whether the post is an offer is treated as unread and tried again.

**Curated data**

- Three plain data files, editable without code changes: neighbourhoods (with spelling variants), faculties (each mapped to its nearby neighbourhoods), and sources (the sites and the Facebook group links).
- "Faculty" means any higher-education institution. V1 ships the 15–20 largest public ones in Grand Tunis.
- The neighbourhood and faculty files were drafted and approved by the site owner. The Facebook group list holds five groups, each checked as public on its logged-out page and found active in the pipeline proof.

**Storage**

- A listing stores: the link to its post (its identity), its source, the listing facts, a short excerpt, the post date, and the collection date.
- One listing per post. Every post a model has read is remembered by its link, offers and rejections alike, so a post collected again is not read again and never produces a second listing. A post no model could read is tried again on the next collection run. Duplicates of the same housing across posts are not merged.
- Hidden listings are stored by post link. A hidden listing is never shown and is not recreated by later collections.
- Expiry is applied when searching: a listing is visible for 14 days from its post date. Sources are not re-checked.

**Search**

- Search takes: a faculty (required), kind (rental, flatshare or both), a per-person budget, a whole-unit budget, a gender (girls, boys or none), sizes, and furnished (yes, no or either).
- Faculty: a listing matches when its neighbourhood is one of the faculty's neighbourhoods.
- Budgets: the per-person budget applies to flatshares and the whole-unit budget to rentals. An empty budget sets no limit for that kind. A listing without a price is hidden for a kind whose budget is set.
- Gender: choosing a gender shows listings restricted to that gender and listings with no stated restriction; it hides only the opposite restriction.
- Furnished and size: a listing that does not state the fact is still shown and labelled as not stated.
- Results are sorted newest first.

**Website**

- French only. Designed for phones first.
- A search form and a results list of listing cards. Each card shows kind, price with its price basis label (or "prix non précisé"), neighbourhood, size, furnished, gender restriction, age, source, the excerpt, the link to the original post, and a "signaler" link.
- "Signaler" opens an email to the site owner with the listing's link filled in. There is no admin interface in v1: the owner hides a listing with a manual database entry.

**Build order**

1. Pipeline proof: collect a few hundred real posts from 2–3 groups, extract them, and review the results in a table with the site owner. Measure the share of real offers, extraction accuracy, and the scraping credit used per 1,000 posts. If the free credit or the scraper output is not good enough, stop and revisit ADR 0001 before building further.
2. Storage, the Tayara and Mubawab adapters, and the daily schedule.
3. The website.
4. Launch checks (see Further Notes).

**Accounts and secrets**

- The site owner creates the Apify, Google AI Studio, Groq and GitHub accounts and supplies the keys. Keys live only in local environment files and in the schedule's secret store, never in the repository.

## Testing Decisions

A good test here checks what a caller can observe (what gets stored, what a search returns) and not how the code arrives there. Tests never call live sites, the scraping service or a model: those sit behind the source and extractor interfaces and are replaced by saved samples and canned answers.

Two seams:

- **Collection: raw posts in, stored listings out.** The collection job is run with fake source adapters returning saved sample posts and a fake extractor returning canned model answers, against a real local SQLite database. Tests assert on the stored listings: offers stored with the right facts, demands and unrelated posts rejected, posts without a known neighbourhood dropped, a re-collected post being neither duplicated nor read again, hidden listings not recreated, phone numbers absent from stored excerpts and from text handed to the extractor, a failing source not blocking the others, and the fallback extractor used when the first fails.
- **Search: criteria in, listings out.** The search is run against a real local SQLite database seeded with listings. Tests cover the rules that are easy to get wrong: faculty to neighbourhood matching, the two budgets and their interaction with kind, price-less listings with and without a budget, gender matching with unspecified, size and furnished with unstated values, 14-day expiry, hidden listings, and newest-first order.

Each real adapter and each real model client is checked once against a saved sample of the real service's output, so that the mapping into the shared shapes is covered without network calls.

The curated data files are checked for integrity: unique identifiers, and every faculty mapped only to neighbourhoods that exist.

Extraction accuracy is not a unit test, since a model's answers vary. It is a manual evaluation: an evaluation set of 50 real posts from the pipeline proof with hand-written expected facts, scored per field by one command, run whenever the prompt or model changes. The command runs the same chain of models as a collection run and is not part of the test run. The set holds post texts, so it stays in a local, uncommitted file (ADR 0002); only the scoring is tested, on made-up posts.

The website's pages are checked by hand on a phone-sized viewport: search for one faculty and follow a listing's link to its source.

Prior art: the collection seam tests, the phone-masking tests, and the adapter and model-client tests that read saved samples. The Facebook sample has the structure of real scraper output with every value made up; the Gemini sample is a real answer for two made-up posts. No Groq key was available, so the Groq client is tested against the documented answer shape only.

## Out of Scope

- Private Facebook groups, Facebook Marketplace, and any collection that needs a Facebook account.
- Tunisie Annonce and other classified sites.
- Cities other than Grand Tunis, and private institutions.
- Demand posts and any matching of students with each other.
- Direct posting of listings on the site.
- Accounts, saved searches, alerts, favourites.
- Photos.
- Merging duplicate posts about the same housing.
- Re-checking whether a source post still exists.
- Distance or commute-time search, and maps.
- Arabic and English interfaces.
- An admin interface.
- Monetization.

## Further Notes

- Open before launch: Tayara's terms of use were read on 2026-10-05: its robots.txt allows everything and the terms do not mention automated collection, but one general clause limits the use of the site's texts and information to normal use of the site, so ticket 07 is stopped until the site owner decides (ask Tayara, go ahead and record why, or leave Tayara out); Mubawab's terms of use were read on 2026-10-05: its robots.txt allows rental search pages and listing pages (but bars any address containing a colon), while the terms forbid reading the site with software of one's own, extracting from its database and reusing its content elsewhere, a link included, without the company's prior permission, so ticket 08 is stopped until the site owner decides (ask Mubawab, go ahead and record why, or leave Mubawab out); with both classified sites stopped, the public Facebook groups are the only source for now; Cloudflare's free quotas have not been re-verified; Gemini's free-tier limits are per project and should be confirmed in the AI Studio console; whether storing an excerpt and a link requires a declaration to the INPDP under law 2004-63 is a legal question for the site owner.
- The Facebook scraper's input and output format was read from its public page, not from a real run. The pipeline proof is the first real call.
- Two details were not discussed in the design session and are assumptions of this spec: hiding a listing is a manual database entry with no admin interface, and a listing that does not state its size or furnishing still appears under a size or furnished filter, labelled as not stated. Results page size is left to the builder.
- Traffic is expected to be seasonal, heaviest from August to October.
- The glossary is in `CONTEXT.md`. ADR 0001 covers Facebook collection; ADR 0002 covers what a listing may store.
