# Hide a listing

For the site owner. Use this when a report email asks for a listing to be removed, or shows it is a scam. There is no admin page: a hidden listing is one line you add to the database by hand.

A hidden listing disappears from every search at once and stays hidden: later collection runs skip its post and count it in the `hidden` column of the table they print.

## Steps

Run the commands in a terminal opened in the project folder. They act on the local database (`local.db`).

1. **Copy the listing's link from the report email.** It is on the first line, after "Annonce signalée :". Copy it whole, with its final `/`.

   The sender can edit that line. A real link has no space, no quote (`'`) and no semicolon. If the one in the email does, do not use it: find the listing on the site and copy its "Voir l'annonce" link.

2. **Check that the link is a listing.** Put the link between the single quotes:

   ```bash
   npm run sql -- "SELECT url, excerpt FROM listings WHERE url = 'THE-LINK'"
   ```

   You should see `1 row.` and the listing's excerpt. `0 rows.` means the link was not copied exactly; compare it with the "Voir l'annonce" link on the site.

3. **Hide it.**

   ```bash
   npm run sql -- "INSERT INTO hidden_listings (url) VALUES ('THE-LINK')"
   ```

   It answers `Done.`. An error containing `UNIQUE constraint failed` means the listing was already hidden.

4. **Check.** Reload the search on the site: the listing is gone. To see everything hidden so far:

   ```bash
   npm run sql -- "SELECT url, hidden_at FROM hidden_listings"
   ```

## When the author asks for removal

Steps 1 to 4 stop the listing from being shown, but its line (link, facts and excerpt) stays in the database. To erase that too, after hiding it:

```bash
npm run sql -- "DELETE FROM listings WHERE url = 'THE-LINK'"
```

Keep the line in `hidden_listings`: it is what stops a later collection run from reading the post again.

## Hidden by mistake

```bash
npm run sql -- "DELETE FROM hidden_listings WHERE url = 'THE-LINK'"
```

The listing shows again in searches, until it is 14 days old like any other. This does not bring back a listing erased as above.

## Good to know

- The report address is `REPORT_EMAIL` in `.env.local` (see `.env.example`). It is written nowhere else; the "Signaler cette annonce" link under every listing uses it.
- Step 3 also works for a link that is not a listing yet: its post is then never read.
- `npm run sql` takes one statement at a time.
- These steps are for the local database. When the site moves to Cloudflare (ticket 09), the same statements must be run on the hosted database, and this page updated with how.
