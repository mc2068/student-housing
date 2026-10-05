# 04: Search by faculty on the website

**What to build:** A student opens the site locally, picks their faculty, and sees the listings in that faculty's neighbourhoods as cards, newest first, each linking to its original post. This is the first slice through the website and the search seam: criteria in, listings out.

**Blocked by:** 03

**Status:** done

- [x] The site runs locally against a local database filled by a collection run
- [x] The student chooses a faculty from the curated list; facultés, écoles and instituts appear alike
- [x] Results contain only listings whose neighbourhood is one of the faculty's neighbourhoods
- [x] Results are sorted newest first
- [x] A listing whose post date is more than 14 days old is not shown
- [x] Each card shows kind, price, neighbourhood, size, furnished, gender restriction, how long ago it was posted, its source, the excerpt, and a link to the original post
- [x] A clear message appears when no listing matches
- [x] The interface is in French
- [x] The form and results are usable on a phone-sized screen
- [x] No account is needed
- [x] Tests at the search seam cover faculty matching, newest-first order and 14-day expiry against a real local SQLite database
- [x] The page is checked by hand on a phone-sized viewport: search for one faculty and follow a listing's link to its source

## Comments

### 2026-10-05 — done

- The site runs locally with `npm run dev` and reads `local.db`, the file `npm run collect` fills. It opens the file read-only; if the file is missing the page says, in French, that listings are not available.
- One page, no account, no JavaScript needed. The student picks a faculty from one list in acronym order (ENIT, FST, INSAT…), whatever the type, and gets the listings of that faculty's neighbourhoods as cards, newest first. The address carries the choice (`/?faculte=fst`), so a search can be shared or bookmarked.
- Verified two ways. Tests at the search seam, against a real in-memory SQLite database filled through the collection store: faculty matching, newest-first order, 14-day expiry to the second, an unknown faculty, and the shape of a returned listing. By hand in a 375×812 viewport on the real local database: FST gave 15 listings and ISI 18, the same counts and order as a direct query; a faculty with no listing showed the "aucune annonce" message; a listing's link led to its own Facebook post.
- **Seen during the hand check:** opened logged out on a phone, Facebook shows the post's title and then asks to log in before showing the rest. A student logged in to Facebook sees the post. Worth knowing before launch (ticket 11).
- The 14-day rule is now written once and used by both the collection run and the search. A listing exactly 14 days old is still shown, as the collection run already counted it.
- **A rule added to the store:** post dates are always stored in their UTC form. Expiry and order compare dates as text, which is only right if every source writes them the same way. Facebook already did; Tayara and Mubawab (tickets 07 and 08) now cannot break it. A collection seam test covers it.
- Each card shows kind, price, neighbourhood, size, furnished, gender restriction, age, source, excerpt and the link. A fact the post does not state is shown in a dashed outline ("Taille non précisée"). Arabic excerpts read right to left.
- **Done ahead of ticket 05:** the price is already labelled "par personne" or "logement entier", and a missing price reads "Prix non précisé". A bare "350 DT" on a flatshare would have been misleading even for a day.
- Results are not paged: with a 14-day window a faculty has tens of listings, not thousands. To revisit if a faculty passes a few hundred.
- The curated data files are now imported instead of read from disk, so the website and the collection run use the same files.
- The glossary gained the French interface words (*annonce*, *publication*, *quartier*, *établissement*) and one sentence saying the "avoid" lists are for code and documents, not interface text.
- Not done here, by design: the other filters (05), "signaler" and hidden listings (06), hosting and the hosted database (09).
- Left as they are after the two-axis review: the footer says listings come from public Facebook groups, which is true until 07 and 08; two groups are both named "COLOCATION TUNIS", so their cards show the same source name; the listing's columns are named once in the store for writing and once in the search for reading.
