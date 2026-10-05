# 08: Mubawab as a source

**What to build:** Rentals for Grand Tunis published on Mubawab are collected and appear in search next to the other listings, with Mubawab shown as their source. Mubawab's listings are structured, so price, size and kind come from the page; only the location needs mapping to a curated neighbourhood.

Mubawab's terms of use are read as part of ticket 11. If they forbid this collection, stop and raise it with the owner.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] A collection run includes Mubawab listings for Grand Tunis through the same source interface as Facebook
- [ ] Each stored listing carries the link to its Mubawab page, its post date, and the facts read from the page
- [ ] The listing's location is mapped to a curated neighbourhood; a listing that maps to none is dropped
- [ ] No seller or agency contact name, phone number or image is stored
- [ ] Requests are paced politely and stay off the paths the site's robots.txt disallows
- [ ] Mubawab failing does not stop the other sources
- [ ] The adapter is tested against saved sample pages, with no test calling the live site
- [ ] Mubawab listings appear in search with their source shown
