# 06: Report and hide a listing

**What to build:** A student or a post author can report a listing from its card, and the site owner can make it a hidden listing that never comes back. There is no admin interface in v1: the owner hides a listing with a manual database entry, following written steps.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] Every card has a "signaler" link that opens an email to the site owner with the listing's link filled in
- [ ] The owner's address is configured in one place and is not hard-wired into the pages
- [ ] A hidden listing does not appear in any search
- [ ] A hidden listing is not recreated or shown again when its post is collected again
- [ ] The steps for the owner to hide a listing by its link are written down where the owner will find them
- [ ] A test at the search seam covers hidden listings being excluded
- [ ] A test at the collection seam covers a hidden listing not being recreated
