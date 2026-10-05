# 07: Tayara as a source

**What to build:** Rentals and flatshares for Grand Tunis published on Tayara are collected and appear in search next to Facebook listings, with Tayara shown as their source. Tayara's listings are structured, so price, size and kind come from the page; only the location needs mapping to a curated neighbourhood.

Tayara's terms of use are read as part of ticket 11. If they forbid this collection, stop and raise it with the owner.

**Blocked by:** 03

**Status:** ready-for-human — stopped on 2026-10-05 before any code: waiting for the owner's decision on Tayara's terms of use (see Comments)

- [ ] A collection run includes Tayara listings for Grand Tunis through the same source interface as Facebook
- [ ] Each stored listing carries the link to its Tayara page, its post date, and the facts read from the page
- [ ] The listing's location is mapped to a curated neighbourhood; a listing that maps to none is dropped
- [ ] No seller name, phone number or image is stored
- [ ] Requests are paced politely and follow the site's robots.txt
- [ ] Tayara failing does not stop the other sources
- [ ] The adapter is tested against saved sample pages, with no test calling the live site
- [ ] Tayara listings appear in search with their source shown

## Comments

### 2026-10-05 — stopped: the terms of use restrict reuse, the owner decides

- Nothing was built. The ticket says to stop if Tayara's terms forbid this collection, and read plainly they do. No criterion is ticked.
- Read on 2026-10-05, logged out, in three requests: `https://www.tayara.tn/robots.txt`, the home page (to find the terms link) and `https://www.tayara.tn/terms/`. That one page holds the terms of use, the privacy policy and the cookie section; the footer links to no other legal page. No search page and no listing page was fetched.
- **robots.txt allows everything.** It has one rule for all robots, `Allow: /`, no disallowed path, no crawl delay, and two sitemaps.
- **The terms say nothing about automated collection.** Robots, scraping, extraction and copying are not mentioned.
- **The terms restrict reuse.** Under "Droits de Propriété Intellectuelle", the operator (Trust & Transactions Tunisia) claims the rights over the texts, images and other documents and information available through the site, and says they cannot be "utilisés d'une manière autre que dans le cadre d'une utilisation normale du site". In plain words: what a visitor reads on Tayara may be used for normal use of Tayara only.
- Why this stops the ticket: for each Tayara listing we would keep a link, facts read from the page, a short excerpt of the post and the post date, and show them on another website. The excerpt is text and the facts are information in the clause's words, and showing them elsewhere is hard to call normal use of Tayara.
- What pulls the other way, for the owner to weigh: robots.txt disallows nothing; the clause is general and names no robot or aggregator; the terms are written for account holders and this collection never logs in; every listing would send the student back to Tayara's own page; no photo, seller name or phone number would be kept (ADR 0002). Whether terms a logged-out reader never accepted bind that reader is a legal question the page does not answer.
- The sanction the terms name for a breach is blocking access to the site, at once and without notice. Tunisian law applies, courts of Tunis.
- **The owner's choices:** ask Tayara for written permission (`https://www.tayara.tn/contact/`); or decide to go ahead and record why in an ADR, possibly storing facts and the link only, with no excerpt, for Tayara; or leave Tayara out of v1.
- If the owner says go ahead, the ticket restarts from its second step: save sample pages, write down the page structure, design the seam for a source that already knows its facts (ticket 08 reuses it), then the adapter. None of that exists yet.
- This reading also answers the first criterion of ticket 11, ticked there. Ticket 08 should read Mubawab's terms the same way before any code.
- The spec's open point on the two sites' terms is updated to say what was found for Tayara.

### 2026-10-05 — fixes after the two-axis code review

- The status says `ready-for-human`: the ticket waits for the owner's decision, not for an agent. The reason is unchanged.
- "A short excerpt of the ad" in the comment above now says "of the post": the glossary keeps "ad" out (`CONTEXT.md`).
