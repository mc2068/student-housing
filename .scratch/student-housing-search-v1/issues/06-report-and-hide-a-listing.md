# 06: Report and hide a listing

**What to build:** A student or a post author can report a listing from its card, and the site owner can make it a hidden listing that never comes back. There is no admin interface in v1: the owner hides a listing with a manual database entry, following written steps.

**Blocked by:** 04

**Status:** done

- [x] Every card has a "signaler" link that opens an email to the site owner with the listing's link filled in
- [x] The owner's address is configured in one place and is not hard-wired into the pages
- [x] A hidden listing does not appear in any search
- [x] A hidden listing is not recreated or shown again when its post is collected again
- [x] The steps for the owner to hide a listing by its link are written down where the owner will find them
- [x] A test at the search seam covers hidden listings being excluded
- [x] A test at the collection seam covers a hidden listing not being recreated

## Comments

### 2026-10-05 — done

- Every card now ends with "Signaler cette annonce". It opens an email to the site owner with the subject "Signalement d'une annonce", the listing's link on the first line, and a line asking for the reason. The footer tells post authors that the same link is how they ask for removal.
- The owner's address is `REPORT_EMAIL` in `.env.local` (listed in the new `.env.example`) and is read in one place, `app/report.ts`. **It is set to a placeholder, `signalement@example.com`: the owner must put the real address there.** Without the variable the results page fails with "Missing REPORT_EMAIL" instead of quietly showing cards with no way to report.
- Hidden listings are a new table, `hidden_listings`, holding the post link and the date. Search leaves out every link in it. A collection run skips those posts before reading them and counts them in a new `hidden` column of its table.
- The owner's steps are in `docs/hide-a-listing.md`, linked from a new `README.md`: check the link, one `INSERT`, check again; plus how to erase the stored line when an author asks for removal, and how to undo a mistake. As the machine has no `sqlite3`, `npm run sql -- "<statement>"` runs one statement on the local database.
- Verified three ways. One new test at each seam, each seen failing first: search never returns a hidden listing whatever the filters; a collection run neither reads nor stores a post whose link is hidden. By hand on the real local database in a 375×812 viewport: 15 cards for FST each with its own link in the email; after the documented `INSERT`, 14 cards; a replay of the 168 saved posts showed `hidden: 1` and recreated nothing; the documented `DELETE` brought the 15th back. The local database is as it was, plus the empty table.
- **Chosen, to revisit:** hiding leaves the listing's line (link, facts, excerpt) in `listings`; it is only never shown. That keeps hiding a single entry that can be undone. For an author's removal request the steps add one `DELETE` that erases the line.
- The link in a report email can be edited by its sender before it is pasted into a statement. The steps say what a real link looks like and to copy it from the site when in doubt, and `npm run sql` refuses more than one statement.
- The glossary gained **Report**.
- Left as they are after the two-axis review: the email link has no automated test, as it sits outside the two agreed seams (checked by hand); `REPORT_EMAIL` is not checked for being a valid address; the website never creates tables, so a database that has not seen a collection run or `npm run sql` since this change fails every search (noted on ticket 09 for the hosted database).
