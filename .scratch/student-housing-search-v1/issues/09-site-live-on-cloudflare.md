# 09: Site live on Cloudflare

**What to build:** A student can reach the site at a public address. The website runs on Cloudflare and reads listings from the hosted database, within the free tier.

The site owner creates the GitHub repository and connects the Cloudflare account; those steps and any key handling are the owner's.

**Blocked by:** 04

**Status:** ready-for-agent (everything that needs no account is built and proven on this machine; the four unticked criteria wait on the owner's steps in `docs/deploy.md`)

- [ ] The hosted database has the same schema as the local one, created by a repeatable step — *the step is written and proven on a local copy; waits on owner steps 2 to 5*
- [ ] The site is deployed and reachable at a public address — *waits on owner step 7*
- [ ] A search on the live site returns listings from the hosted database — *waits on owner steps 6 and 7*
- [ ] Deploying again is one documented command or one push — *`npm run deploy` is written and documented, and was run here up to the point where it sends; it has never sent, so this waits on owner step 7*
- [x] No key or credential is in the repository
- [x] Cloudflare's free quotas for the site and database are confirmed against expected use, and the figures recorded in this ticket's comments
- [ ] The live site is checked by hand on a phone — *waits on owner step 8*

## Comments

### 2026-10-05 — carried over from ticket 06

- The hosted database needs the `hidden_listings` table before the site reads it: the website opens the database read-only and never creates tables, and every search queries that table.
- `REPORT_EMAIL` must be set for the deployed site; the results page fails without it.
- `docs/hide-a-listing.md` describes the local database and `npm run sql`. It must be updated with how to run the same statements on the hosted database.

### 2026-10-05 — built up to the owner's account steps

Nothing was deployed: this machine has no Cloudflare login and the project has no GitHub remote, and creating either is the owner's. What follows was all done without an account.

**What the owner can now do**

- Follow `docs/deploy.md`, linked from the README: nine steps in order, each with its exact command or screen. In short: move the collection keys to their own file, create the account, `npx wrangler login`, create the database and paste its identifier into `wrangler.jsonc`, `npm run hosted:schema`, `npm run hosted:fill`, `npm run deploy`, check on a phone, look at the meters.
- Send the site again after any change with one command, `npm run deploy`.
- See the site exactly as Cloudflare will run it, on this machine and with no account: `npm run preview`.
- Hide a listing on the live site: `docs/hide-a-listing.md` now gives the same statements for the hosted database (`npm run hosted:sql -- "…"`) and says which database is which.

**What was built**

- The website builds for Cloudflare Workers with the OpenNext Cloudflare adapter (1.20.8, with Next.js 16.3.8 and wrangler 4.147.0). `wrangler.jsonc` names the site `logement-etudiant` and binds the database `student-housing` as `DB`.
- The deployed site reads the hosted database through a new implementation of the small database interface (`db/d1.ts`). `npm run dev`, `npm run collect` and the tests still use local SQLite; the site chooses by where it is running (`app/database.ts`).
- The hosted tables come from `db/schema.sql`, the same file the local database is made from: `npm run hosted:schema`. There is no second copy of the schema. It can be run again at any time.
- `npm run hosted:fill` copies the local database's listings, read posts and hidden listings to the hosted one, so the live site has listings before the daily collection exists. It never changes a row that is already there.
- `npm run hosted:sql` runs one statement on the hosted database and, like `npm run sql`, refuses more than one.

**How it was checked**

- The Workers build succeeds on this Windows machine. The build tool warns that Windows is not fully supported. Of about ten builds, one failed, while a local server left running was still holding the built files; none failed otherwise.
- The built site was served by wrangler's local mode, which runs Cloudflare's own runtime, with a local database created by the same `hosted:schema` and `hosted:fill` code (79 listings, 168 read posts, identical row for row to `local.db`). Searches for FST, ISI, ENIT and INSAT returned 15, 18, 15 and 8 listings: the same listings in the same order as a direct search of `local.db`, and the same counts ticket 04 recorded. A search with filters matched too. The stylesheet and the font load, an unknown address answers 404, and every card's "Signaler" link carries the address from `.env.local`.
- The page was looked at in a 375×812 viewport.
- The hide-a-listing statements were run through `npm run hosted:sql` on that local database while the site was being served: 15 cards, 14 after the `INSERT`, the `UNIQUE constraint failed` message on a second `INSERT`, 15 again after the `DELETE`; two statements in one command were refused.
- A new test runs the collection store and the search on a real local D1 and on SQLite with the same rows and expects the same answers. It was seen failing with the D1 implementation broken. 88 tests pass, type checking passes, `npm run build` passes, and `npm run dev` still shows 15 listings for FST from `local.db`.
- `npm run deploy` was run: it builds, then stops at its check before sending anything, as it should here.

**Not checked, because it needs the account**

- The three `hosted:` commands against the real hosted database. They use the same code as the local run with one word changed (`--remote` for `--local`).
- That wrangler asks for a `workers.dev` subdomain on the first deploy, and the exact names of the dashboard screens in step 9. The steps give direct addresses as well as names.
- Processor time on Cloudflare's servers (see the quotas below).

**Decided**

- **The collection keys moved out of `.env.local`, into `.env.collect`.** Found while building: the adapter copies every value of `.env.local` into the site it uploads. With the keys left there, the first deploy would have sent the Apify and Gemini keys to Cloudflare inside the site's code. `npm run collect` now reads `.env.collect`, and `.env.local` holds the report address only. This is the owner's step 1, and until it is done `npm run collect` fails for want of its file.
- **`npm run deploy` checks before it sends.** It refuses a built site that carries any value other than `REPORT_EMAIL`, an address missing or ending in `@example.com` (the placeholder ticket 06 left), or a `wrangler.jsonc` still holding the placeholder database identifier. It prints names, never values. Each refusal was seen.
- **The report address reaches the live site from `.env.local`**, through that same copying, so it stays configured in one place for the local and the live site and is not in the repository. To change it: edit the file and deploy.
- **Deploying is a command on the owner's machine, not a push.** There is no remote yet, and the command needs nothing but the login. Building on Cloudflare at each push is possible later; it would need the report address supplied another way.
- **No cache store and no image service**, though the adapter's starter files set up both. The site has one page, rendered for each search, and no images.
- **The database identifier goes in the repository** once the owner has it. It is not a key.
- The local database, `npm run dev` and `npm run sql` are unchanged.

**Free quotas against expected use**

Read on 2026-10-05 from Cloudflare's own pages.

| Limit (free plan) | Figure | Expected use | Page |
| --- | --- | --- | --- |
| Site requests | 100,000 a day, reset at midnight UTC; then error 1027 | One per page view. Static files (stylesheet, font, scripts) are free and not counted. | https://developers.cloudflare.com/workers/platform/limits/ and https://developers.cloudflare.com/workers/platform/pricing/ |
| Processor time per request | 10 ms; then error 1102 | **Not confirmed, see below** | https://developers.cloudflare.com/workers/platform/limits/#cpu-time |
| Site size | 64 MiB uncompressed, no compressed limit | 3.9 MiB (0.8 MiB compressed), from a dry run | https://developers.cloudflare.com/workers/platform/limits/#worker-size |
| Database queries per request | 50 | 1 per search | https://developers.cloudflare.com/d1/platform/limits/ |
| Rows read | 5 million a day, reset at 00:00 UTC; then queries fail | Measured on the local D1: 23 to 57 rows per search with 79 listings, about 3 per listing shown. With a few hundred visible listings, a few hundred rows per search: 15,000 searches a day or more. | https://developers.cloudflare.com/d1/platform/pricing/ |
| Rows written | 100,000 a day | A daily run reading 250 posts and storing 40 listings writes about 600 (a listing is 3 rows with its indexes, a read post 2). The first `hosted:fill` writes under 1,000. | same |
| Database size | 500 MB per database, 5 GB per account, 10 databases | `local.db` is 115 KB for 79 listings and 168 read posts. At 250 posts read a day, about 60 MB a year. Old listings are never deleted, so this is the one figure that grows: worth a look once a year. | https://developers.cloudflare.com/d1/platform/limits/ |
| Bound parameters per query | 100 | A search binds at most 8 neighbourhoods and a few filters. Matters for ticket 10. | same |

- Since 2026-09-01 Cloudflare enforces the daily row limits on free accounts: past them, queries fail until midnight UTC and the owner gets an email (https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/). The site would then show its "annonces pas disponibles" page. With no payment card on the account there is no way to be charged.
- The search uses the index on neighbourhood and post date, so it reads the rows it shows and not the whole table. Rows read will not grow as old listings pile up.
- **Processor time is the open risk, and it serves ticket 11.** The limit is 10 ms per request. It cannot be measured without deploying: the local runtime does not count it. A rough local figure: 40 searches of 20 listings sent at once were all answered in 0.6 s, so at most about 15 ms of work each on this machine, database included. Cloudflare's page says server-rendered pages "typically use 10-20 ms". So the site is near the line, and may be over it. Owner step 9 is where this is settled: the site's Metrics screen shows "Exceeded CPU Time Limits" if searches are being refused. If they are, the options are to render fewer listings per page, to make the page lighter, or the paid plan (5 dollars a month at least, https://developers.cloudflare.com/workers/platform/pricing/), which the zero budget rules out.
- The OpenNext documentation states a 3 MiB compressed size limit on the free plan; Cloudflare's own page no longer has a compressed limit. The site is under both.

**Left for others**

- Ticket 10: the collection run writing to the hosted database. What it needs to know (how to reach D1 from GitHub Actions, the token and its permissions, the 100-parameter limit) is in the shared notes, `09-hosted-database.md`.
- Ticket 11: the processor-time check above, once the site is live.
- `next dev` in this version of Next.js adds a block of advice for coding agents to `CLAUDE.md` every time it starts. It was not committed. The owner can keep reverting it or turn it off with `agentRules: false` in `next.config.ts`.
