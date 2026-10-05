# Hide a listing

For the site owner. Use this when a report email asks for a listing to be removed, or shows it is a scam. There is no admin page: a hidden listing is one line you add to the database by hand.

A hidden listing disappears from every search at once and stays hidden: later collection runs skip its post and count it in the `hidden` column of the table they print.

## Which database

There are two, and the statements are the same on both. Only the start of the command changes.

| Database | Start of the command | What reads it |
| --- | --- | --- |
| Hosted | `npm run hosted:sql --` | The live site. A report email is about this one. |
| Local (`local.db`) | `npm run sql --` | `npm run dev` on this machine. |

The steps below are written for the hosted database. It needs this machine logged in to Cloudflare (`npx wrangler login`, see [deploy.md](deploy.md)). To act on the local one, write `npm run sql --` in place of `npm run hosted:sql --`.

Until the daily collection writes to the hosted database (ticket 10), collection runs fill the local one and `npm run hosted:fill` copies it over. A listing hidden on the hosted database stays hidden after such a copy. If you also erase its line (see "When the author asks for removal"), erase it on the local database too, or the next copy stores it again.

## Steps

Run the commands in a terminal opened in the project folder.

1. **Copy the listing's link from the report email.** It is on the first line, after "Annonce signalée :". Copy it whole, with its final `/`.

   The sender can edit that line. A real link has no space, no quote (`'`) and no semicolon. If the one in the email does, do not use it: find the listing on the site and copy its "Voir l'annonce" link.

2. **Check that the link is a listing.** Put the link between the single quotes:

   ```bash
   npm run hosted:sql -- "SELECT url, excerpt FROM listings WHERE url = 'THE-LINK'"
   ```

   You should see `1 row.` and the listing's excerpt. `0 rows.` means the link was not copied exactly; compare it with the "Voir l'annonce" link on the site.

3. **Hide it.**

   ```bash
   npm run hosted:sql -- "INSERT INTO hidden_listings (url) VALUES ('THE-LINK')"
   ```

   It answers `Done.`. An error containing `UNIQUE constraint failed` means the listing was already hidden.

4. **Check.** Reload the search on the site: the listing is gone. To see everything hidden so far:

   ```bash
   npm run hosted:sql -- "SELECT url, hidden_at FROM hidden_listings"
   ```

## When the author asks for removal

Steps 1 to 4 stop the listing from being shown, but its line (link, facts and excerpt) stays in the database. To erase that too, after hiding it:

```bash
npm run hosted:sql -- "DELETE FROM listings WHERE url = 'THE-LINK'"
```

Keep the line in `hidden_listings`: it is what stops a later collection run from reading the post again.

## Hidden by mistake

```bash
npm run hosted:sql -- "DELETE FROM hidden_listings WHERE url = 'THE-LINK'"
```

The listing shows again in searches, until it is 14 days old like any other. This does not bring back a listing erased as above.

## Good to know

- The report address is `REPORT_EMAIL` in `.env.local` (see `.env.example`). It is written nowhere else; the "Signaler cette annonce" link under every listing uses it. The live site takes it from that file when you run `npm run deploy`.
- Step 3 also works for a link that is not a listing yet: its post is then never read.
- Both commands take one statement at a time.
- `npm run hosted:fill` copies the local hidden listings to the hosted database along with the listings. It never removes a line from the hosted database.
