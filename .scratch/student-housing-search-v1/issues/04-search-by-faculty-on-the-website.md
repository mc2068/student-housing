# 04: Search by faculty on the website

**What to build:** A student opens the site locally, picks their faculty, and sees the listings in that faculty's neighbourhoods as cards, newest first, each linking to its original post. This is the first slice through the website and the search seam: criteria in, listings out.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] The site runs locally against a local database filled by a collection run
- [ ] The student chooses a faculty from the curated list; facultés, écoles and instituts appear alike
- [ ] Results contain only listings whose neighbourhood is one of the faculty's neighbourhoods
- [ ] Results are sorted newest first
- [ ] A listing whose post date is more than 14 days old is not shown
- [ ] Each card shows kind, price, neighbourhood, size, furnished, gender restriction, how long ago it was posted, its source, the excerpt, and a link to the original post
- [ ] A clear message appears when no listing matches
- [ ] The interface is in French
- [ ] The form and results are usable on a phone-sized screen
- [ ] No account is needed
- [ ] Tests at the search seam cover faculty matching, newest-first order and 14-day expiry against a real local SQLite database
- [ ] The page is checked by hand on a phone-sized viewport: search for one faculty and follow a listing's link to its source
