# 07: Tayara as a source

**What to build:** Rentals and flatshares for Grand Tunis published on Tayara are collected and appear in search next to Facebook listings, with Tayara shown as their source. Tayara's listings are structured, so price, size and kind come from the page; only the location needs mapping to a curated neighbourhood.

Tayara's terms of use are read as part of ticket 11. If they forbid this collection, stop and raise it with the owner.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] A collection run includes Tayara listings for Grand Tunis through the same source interface as Facebook
- [ ] Each stored listing carries the link to its Tayara page, its post date, and the facts read from the page
- [ ] The listing's location is mapped to a curated neighbourhood; a listing that maps to none is dropped
- [ ] No seller name, phone number or image is stored
- [ ] Requests are paced politely and follow the site's robots.txt
- [ ] Tayara failing does not stop the other sources
- [ ] The adapter is tested against saved sample pages, with no test calling the live site
- [ ] Tayara listings appear in search with their source shown
