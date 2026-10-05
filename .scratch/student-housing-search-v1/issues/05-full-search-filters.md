# 05: Full search filters

**What to build:** A student narrows results by kind, budget, gender, size and furnishing, and every card makes clear what its price covers and which facts the post did not state.

**Blocked by:** 04

**Status:** done

- [x] The student can choose rentals, flatshares, or both
- [x] A per-person budget limits flatshares only; a whole-unit budget limits rentals only
- [x] An empty budget sets no limit for that kind
- [x] A listing without a price is shown as "prix non précisé" when no budget applies to its kind, and hidden when one does
- [x] Each price is labelled "par personne" for a flatshare or "logement entier" for a rental
- [x] Choosing a gender shows listings restricted to that gender and listings with no stated restriction, each labelled; only the opposite restriction is hidden
- [x] The student can filter by one or more sizes (S+n, studio included)
- [x] The student can filter by furnished or unfurnished
- [x] A listing that does not state its size or furnishing still appears under those filters, labelled as not stated
- [x] Filters combine with the faculty and with each other
- [x] Tests at the search seam cover each rule above, including the interaction of the two budgets with kind
- [x] The filters are usable on a phone-sized screen and labelled in French

## Comments

### 2026-10-05 — done

- The form now carries five filters under the faculty, folded behind "Affiner la recherche": kind, the two budgets, gender, sizes, furnished. It still works without JavaScript, and the address carries every choice (`/?faculte=fst&type=colocation&budget_personne=400&genre=filles`), so a filtered search can be shared.
- The results page lists the filters in force above the cards, with "Retirer les filtres" to go back to every listing of the faculty. When nothing matches, the message says so and suggests raising the budget or removing a filter.
- Verified two ways. Ten new tests at the search seam against a real in-memory SQLite database, one rule each: kind, each budget alone, the two budgets together and with kind, price-less listings, gender, sizes, the largest size, furnished, and every filter combined with the faculty and the 14 days. By hand in a 375×812 viewport on the real local database for FST (15 listings): each filter gave the count a direct query gives, for instance flatshares up to 400 DT open to girls gave 6, with the 4 price-less flatshares left out. No sideways scroll down to 320 px wide; every choice is 44 px tall.
- **A rule added here:** the size choices are Studio, S+1, S+2, S+3 and "S+4 et +". The last one also matches every larger unit. Sizes are stored up to S+10, and eleven boxes on a phone would be too many for units students rarely rent.
- **Chosen, to revisit if it annoys:** the filters stay folded on the results page even when some are set, so the listings stay near the top of a phone screen. The count in "Affiner la recherche (3)" and the list above the cards show what is set.
- A budget for the kind the student left out is ignored and not announced: with "Location" chosen, a per-person budget changes nothing.
- An address value the form could not have sent (an unknown kind, a budget of 0 or text, a size outside the choices) is dropped without an error.
- Prices and unstated facts were already labelled on the cards in ticket 04; nothing changed there.
- The glossary gained **Filter** and **Budget**. A filter "leaves out" a listing; "hidden" stays reserved for the hidden listing of ticket 06.
- Left as they are after the two-axis review: the address reading has no automated tests, as it sits outside the two agreed seams (checked by hand, including the two slips the review found and that are now fixed); a submitted form leaves empty entries in the address (`budget_logement=&meuble=`), harmless and only avoidable with JavaScript or a redirect; the hints under the budgets and at the foot of the filters are not tied to their fields for screen readers.
