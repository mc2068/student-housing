# Put the site online

For the site owner. The website runs on Cloudflare Workers and reads listings from a hosted database (Cloudflare D1), both on the free plan. Everything that needs no account is already in the repository. The steps below are the ones only you can do, because they use your Cloudflare account.

Run the commands in a terminal opened in the project folder, after `npm ci`.

## First time

Do these once, in order.

1. **Move the collection keys out of `.env.local`.** Whatever `.env.local` holds is copied into the site sent to Cloudflare, so it must hold the report address and nothing else.

   - Rename `.env.local` to `.env.collect`. `npm run collect` now reads its keys there.
   - Create a new `.env.local` with one line, your real address in place of the example:

     ```
     REPORT_EMAIL=you@your-mail.tn
     ```

   `npm run deploy` checks this and refuses to send a site that carries a key, or an `@example.com` address.

2. **Create a Cloudflare account**, if you have none: <https://dash.cloudflare.com/sign-up>. The free plan is enough and asks for no payment card.

3. **Log this machine in.**

   ```bash
   npx wrangler login
   ```

   Your browser opens on Cloudflare; choose **Allow**. The login is kept in your user folder, not in the project.

4. **Create the hosted database.**

   ```bash
   npx wrangler d1 create student-housing --location weur
   ```

   If it asks to add the database to your configuration file, answer **no**. It prints a `database_id`. Open `wrangler.jsonc` and put that value in place of `00000000-0000-0000-0000-000000000000`. This identifier is not a key: it opens nothing without your login, and it belongs in the repository. Commit the change.

5. **Create its tables.**

   ```bash
   npm run hosted:schema
   ```

   It ends with a table showing `0` listings. The tables come from `db/schema.sql`, the same file the local database is made from. Run it again whenever that file changes; tables already there are left alone.

6. **Copy your local listings to it**, so the site has something to show before the daily collection exists (ticket 10).

   ```bash
   npm run hosted:fill
   ```

   It ends with the number of listings the hosted database now holds. It also copies the posts already read and your hidden listings. A listing more than 14 days old is copied but not shown; if your local ones are that old, do a collection run first.

7. **Send the site.**

   ```bash
   npm run deploy
   ```

   The first time, Cloudflare may ask you to choose a `workers.dev` subdomain: it becomes part of the address. The command ends by printing the site's address, of the form `https://logement-etudiant.<your-subdomain>.workers.dev`.

8. **Check on your phone.** Open the address, choose a faculty, see listings, follow one "Voir l'annonce" link, and tap "Signaler cette annonce": the email must be addressed to you.

9. **The same day and a few days later, look at the meters.**

   - The site: <https://dash.cloudflare.com/?to=/:account/workers-and-pages> > **logement-etudiant** > **Metrics**. Requests a day (free limit 100,000) and, among the errors, **Exceeded CPU Time Limits**, which must stay at zero (see "The one limit to watch" below).
   - The database: <https://dash.cloudflare.com/?to=/:account/workers/d1> > **student-housing** > **Metrics**. Rows read a day (free limit 5 million).

## Later

- **After any change to the site:** `npm run deploy`. That one command builds, checks and sends.
- **After a change to `db/schema.sql`:** `npm run hosted:schema`, then `npm run deploy`.
- **To hide a listing on the live site:** [hide-a-listing.md](hide-a-listing.md).
- **To change the report address:** edit `.env.local`, then `npm run deploy`.

## Try the built site on this machine first

```bash
npm run preview
```

This builds the site exactly as `npm run deploy` does and serves it at <http://localhost:8787>, on Cloudflare's own runtime, reading a copy of your local database. It needs no account and sends nothing. Stop it with Ctrl+C.

## Good to know

- **Free limits.** 100,000 page views a day, 5 million database rows read a day and 100,000 written, 500 MB of database. One search reads about three rows per listing it shows, so with a few hundred visible listings the rows allow some 15,000 searches a day. Past a limit, the site answers with an error until midnight UTC; with no payment card on the account, Cloudflare cannot charge. The figures and their sources are in ticket 09's comments.
- **The one limit to watch** is working time: the free plan gives each page 10 milliseconds of processor time. Measured on this machine, a search takes at most about 15, and Cloudflare's servers may be faster or slower. This can only be known on the live site: step 9 shows it. If searches are refused, tell the maintainer; showing fewer listings per page is the first thing to try.
- **Windows.** The build tool warns that Windows is not fully supported. It built and ran correctly here (Windows 10, Node 24). If it ever fails on your machine, the same command works from WSL (Linux inside Windows). Cloudflare can also build the site itself each time you push to GitHub, but that route needs the report address supplied another way: ask the maintainer before choosing it.
- **Nothing secret is in the repository.** `wrangler.jsonc` holds names and one identifier. Your login stays in your user folder; `.env.local` and `.env.collect` are ignored by git.
- **The site's name.** `logement-etudiant` in `wrangler.jsonc` is the start of the address. Change it before step 7 if you want another.

## For the daily collection (ticket 10)

Not needed to put the site online. The daily collection runs on GitHub, so the project must be there:

1. Create an empty repository at <https://github.com/new> (no README, no licence).
2. Send the project to it, with the address GitHub shows you:

   ```bash
   git remote add origin https://github.com/<you>/<repository>.git
   git push -u origin main
   ```

The keys the collection needs will go in the repository's secrets on GitHub, never in its files. Those steps come with ticket 10.
