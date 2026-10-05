# Student Housing Search

A website that gathers housing offers for students in Tunisia from classified sites and public Facebook groups, and lets a student filter them around their faculty. Contact always happens on the original post.

## Language

The website's interface is in French. Where a term has a French interface word, it follows the term in italics. The _Avoid_ lists apply to code, comments and documents; interface text uses the French words.

### Listings

**Post** (*publication*):
What an author published on a source, whatever it is about. A post that offers housing becomes a listing; every other post is rejected.
_Avoid_: Message, publication

**Listing** (*annonce*):
One housing offer taken from one post on a source, always carrying a link to that post.
_Avoid_: Offer, ad, annonce

**Rental** (*location*):
A listing for a whole unit, priced for the unit.
_Avoid_: Location (reads as "place" in English)

**Flatshare** (*colocation*):
A listing for a room or bed in a unit shared with others, priced per person.
_Avoid_: Colocation, roommate offer

**Demand**:
A post by someone looking for housing or for a roommate to search with. A demand is never a listing.
_Avoid_: Request, wanted ad

**Kind**:
Whether a listing is a rental or a flatshare.
_Avoid_: Type, category

**Price basis**:
Whether a listing's price is per person (flatshare) or for the whole unit (rental).

**Gender restriction**:
Who a listing is open to: girls only, boys only, or unspecified.

**Hidden listing**:
A listing the site owner removed after a report; it stays removed even if its source is collected again.

**Collection run**:
One pass over every source that gathers its newest posts and turns the offers among them into listings.
_Avoid_: Scrape, crawl, sync

### Search

**Filter** (*filtre*):
An optional choice that narrows a search around a faculty: kind, a budget, gender, sizes, furnished. A filter leaves a listing out of the results; "hidden" is kept for a hidden listing.
_Avoid_: Criterion (the search criteria are the faculty plus the filters)

**Budget**:
The most a student will pay a month. The per-person budget limits flatshares and the whole-unit budget limits rentals; neither touches the other kind.
_Avoid_: Max price, price limit

### Places

**Source**:
A classified site or public Facebook group that posts are collected from.

**Faculty** (*établissement*; the form asks for "faculté, école ou institut"):
Any higher-education institution a student searches around, whether a faculté, école or institut.
_Avoid_: University, school, establishment

**Neighbourhood** (*quartier*):
A named area from the curated list. A listing belongs to exactly one, and a faculty is near several.
_Avoid_: Zone, quartier, delegation, area
