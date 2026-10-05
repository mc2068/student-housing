# 11: Launch checks

**What to build:** Before the site is announced to students, the open questions from the spec are answered and recorded, so the site owner launches knowing where the project stands on terms of use, quotas and personal data.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

- [x] Tayara's terms of use are read and what they say about automated collection and reuse of listings is recorded
- [x] Mubawab's terms of use are read and the same is recorded
- [ ] Gemini's free-tier limits for the chosen model are confirmed in the AI Studio console and recorded
- [ ] Cloudflare's free quotas are confirmed (shared with ticket 09)
- [ ] The site owner has an answer on whether storing an excerpt and a link requires a declaration to the INPDP under law 2004-63, and acts on it
- [ ] The site states what it is, where listings come from, and how to ask for a listing's removal
- [ ] Any finding that conflicts with ADR 0001 or ADR 0002 is raised with the owner before launch

## Comments

### 2026-10-05 — Tayara's terms read (from ticket 07)

- Tayara's robots.txt and terms of use were read on 2026-10-05; what they say is recorded in ticket 07's comments. In short: robots.txt allows everything; the terms do not mention automated collection; one general clause limits the use of the site's texts and information to normal use of the site.
- That clause conflicts with collecting and showing Tayara listings as the spec plans, so ticket 07 stopped before any code and the owner has to decide.

### 2026-10-05 — Mubawab's terms read (from ticket 08)

- Mubawab's robots.txt and terms of use were read on 2026-10-05; what they say is recorded in ticket 08's comments. In short: robots.txt allows rental search pages and listing pages (but bars any address containing a colon); the terms forbid reading the site with software of one's own, extracting from its database, and reusing its content elsewhere, a link included, without the company's prior permission.
- That conflicts with collecting and showing Mubawab listings as the spec plans, more plainly than for Tayara, so ticket 08 stopped before any code and the owner has to decide.
- Both classified sites are now waiting on the owner. Until one says yes or the owner decides otherwise, the public Facebook groups are the only source.

### 2026-10-05 — Cloudflare's free quotas read (from ticket 09)

- The free limits for Workers and D1 were read from Cloudflare's own pages on 2026-10-05 and compared with expected use; the figures and page addresses are in ticket 09's comments. All fit, with one open point: the 10 ms of processor time per request can only be measured on the live site (step 9 of `docs/deploy.md`).
- The box above stays unticked until that figure has been read on the live site.
