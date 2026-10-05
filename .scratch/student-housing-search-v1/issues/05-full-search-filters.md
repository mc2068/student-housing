# 05: Full search filters

**What to build:** A student narrows results by kind, budget, gender, size and furnishing, and every card makes clear what its price covers and which facts the post did not state.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] The student can choose rentals, flatshares, or both
- [ ] A per-person budget limits flatshares only; a whole-unit budget limits rentals only
- [ ] An empty budget sets no limit for that kind
- [ ] A listing without a price is shown as "prix non précisé" when no budget applies to its kind, and hidden when one does
- [ ] Each price is labelled "par personne" for a flatshare or "logement entier" for a rental
- [ ] Choosing a gender shows listings restricted to that gender and listings with no stated restriction, each labelled; only the opposite restriction is hidden
- [ ] The student can filter by one or more sizes (S+n, studio included)
- [ ] The student can filter by furnished or unfurnished
- [ ] A listing that does not state its size or furnishing still appears under those filters, labelled as not stated
- [ ] Filters combine with the faculty and with each other
- [ ] Tests at the search seam cover each rule above, including the interaction of the two budgets with kind
- [ ] The filters are usable on a phone-sized screen and labelled in French
