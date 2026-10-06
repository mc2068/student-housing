# 08: Mubawab as a source

**What to build:** Rentals for Grand Tunis published on Mubawab are collected and appear in search next to the other listings, with Mubawab shown as their source. Mubawab's listings are structured, so price, size and kind come from the page; only the location needs mapping to a curated neighbourhood.

Mubawab's terms of use are read as part of ticket 11. If they forbid this collection, stop and raise it with the owner.

**Blocked by:** 03

**Status:** wontfix — left out of v1 by the site owner on 2026-10-06, after Mubawab's terms of use were read (see Comments)

- [ ] A collection run includes Mubawab listings for Grand Tunis through the same source interface as Facebook
- [ ] Each stored listing carries the link to its Mubawab page, its post date, and the facts read from the page
- [ ] The listing's location is mapped to a curated neighbourhood; a listing that maps to none is dropped
- [ ] No seller or agency contact name, phone number or image is stored
- [ ] Requests are paced politely and stay off the paths the site's robots.txt disallows
- [ ] Mubawab failing does not stop the other sources
- [ ] The adapter is tested against saved sample pages, with no test calling the live site
- [ ] Mubawab listings appear in search with their source shown

## Comments

### 2026-10-05 — stopped: the terms of use forbid this collection, the owner decides

- Nothing was built. The ticket says to stop if Mubawab's terms forbid this collection, and they do, more plainly than Tayara's. No criterion is ticked.
- Read on 2026-10-05, logged out, in three requests: `https://www.mubawab.tn/robots.txt`, the home page (to find the terms link) and `https://www.mubawab.tn/fr/privacy`. That one page holds the terms of use ("Conditions d'utilisation"), the data protection section and the cookie section; the footer links to no other legal page. No search page and no listing page was fetched.
- **robots.txt allows the pages we would read.** For robots in general it bars the login, `/cms/`, back-office, `/ads/b/` and report paths, any address containing a colon (`/*:`) and `/*?n=1`. Rental search pages (`/fr/st/<town>/appartements-a-louer`) and listing pages are allowed, with no crawl delay. Not checked on a real search page: Mubawab's paginated and filtered search addresses are, as far as is known, written with colons, so the rule probably leaves only the first page of each search.
- **The terms forbid automated collection.** Article 5.1: the user undertakes not to use "dispositifs ou logiciels autres que ceux fournis par la Société" to extract or consult all or part of the site. In plain words: the site may be read in a browser by a person, not fetched and read by a program. Article 7.3 forbids extracting a substantial part of the site's database by any means, and article 7.5 forbids siphoning off its content.
- **The terms forbid reuse.** Use must be strictly personal (5.1, 7.4). No reuse of all or part of the site in a form or medium the company has not authorised (5.1); no reproduction or use of its content without prior express permission, called infringement otherwise (7.1); no making a substantial part of the database available to the public, a hypertext link included, and no competing database drawn from all or part of it, free or paid (7.3).
- Why this stops the ticket: for each Mubawab listing we would fetch its page with our own program, keep a link, facts read from the page, a short excerpt and the post date, and show them on another website. Each of those steps is named by a clause.
- **Compared with Tayara (ticket 07), judged the same way.** Tayara: robots.txt allows everything, the terms never mention automated collection, and one general clause limits texts and information to normal use of the site; the terms address account holders. Mubawab: robots.txt allows the pages, but the terms forbid collection by software and reuse elsewhere in several explicit clauses, and say that accessing the site is accepting them, so a logged-out reader is addressed directly. Mubawab's "no" is the firmer of the two.
- What pulls the other way, for the owner to weigh: robots.txt allows the pages; article 7.3 speaks of a "substantial" part and a few dozen Grand Tunis rentals a day is a small share (5.1 and 7.1 set no such threshold); every listing would send the student back to Mubawab's own page; no photo, agency name or phone number would be kept (ADR 0002); the site is free. The terms are under Moroccan law and Moroccan courts, and what that means for a site owner in Tunisia is a legal question the page does not answer.
- The sanction the terms name is refusing access to the site without notice, plus civil and criminal liability for infringement.
- **The owner's choices:** ask Mubawab for written permission or a feed (`https://www.mubawab.tn/fr/contact`, `info@mubawab.com`); or decide to go ahead on the owner's own reading or advice and record why in an ADR, knowing that storing facts and a link without an excerpt does not get round these clauses; or leave Mubawab out of v1. With Tayara also waiting, v1 would then launch on the public Facebook groups alone, and the spec's Solution and Sources sections would need rewording.
- If the owner says go ahead, the ticket restarts from its second step: check the colon rule on a real search address, save sample pages, write down the page structure, design the seam for a source that already knows its facts (today every post goes through the model), then the adapter. None of that exists yet, for Tayara either.
- The site footer still says listings come from public Facebook groups. That is true as things stand, so it was left alone.
- This reading also answers the second criterion of ticket 11, ticked there. The spec's open point on the two sites' terms is updated.

### 2026-10-05 — fixes after the two-axis code review

- The status says `ready-for-human`: the ticket waits for the owner's decision, not for an agent. The reason is unchanged.

### 2026-10-06 — owner's decision: left out of v1

The site owner decided to leave Mubawab out of v1. Nothing was built and no listing page of the site was ever fetched. The spec now names the public Facebook groups as the only v1 source and lists Mubawab under Out of Scope. Adding it later starts with the site's written permission; the reading of its terms above, and the structured-source seam this ticket describes, are where that work would begin.
