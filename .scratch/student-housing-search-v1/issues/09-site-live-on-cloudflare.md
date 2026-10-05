# 09: Site live on Cloudflare

**What to build:** A student can reach the site at a public address. The website runs on Cloudflare and reads listings from the hosted database, within the free tier.

The site owner creates the GitHub repository and connects the Cloudflare account; those steps and any key handling are the owner's.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] The hosted database has the same schema as the local one, created by a repeatable step
- [ ] The site is deployed and reachable at a public address
- [ ] A search on the live site returns listings from the hosted database
- [ ] Deploying again is one documented command or one push
- [ ] No key or credential is in the repository
- [ ] Cloudflare's free quotas for the site and database are confirmed against expected use, and the figures recorded in this ticket's comments
- [ ] The live site is checked by hand on a phone

## Comments

### 2026-10-05 — carried over from ticket 06

- The hosted database needs the `hidden_listings` table before the site reads it: the website opens the database read-only and never creates tables, and every search queries that table.
- `REPORT_EMAIL` must be set for the deployed site; the results page fails without it.
- `docs/hide-a-listing.md` describes the local database and `npm run sql`. It must be updated with how to run the same statements on the hosted database.
