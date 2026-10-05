# Student housing search

Student housing listings for Grand Tunis, collected from public Facebook groups and searched by faculty. The glossary is in [CONTEXT.md](CONTEXT.md); the decisions are in [docs/adr](docs/adr).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | The website, on the local database |
| `npm run collect` | One collection run into the local database (options at the top of `collection/run.ts`) |
| `npm run sql -- "<statement>"` | One SQL statement on the local database |
| `npm test` | The tests |
| `npm run typecheck` | Type checking |
| `npm run preview` | The website as built for Cloudflare, served on this machine from a copy of the local database |
| `npm run deploy` | Builds the website and sends it to Cloudflare |
| `npm run hosted:schema` | Creates the hosted database's tables from `db/schema.sql` |
| `npm run hosted:fill` | Copies the local database's rows to the hosted database |
| `npm run hosted:sql -- "<statement>"` | One SQL statement on the hosted database |

The last four act on the site owner's Cloudflare account and need `npx wrangler login` first.

Two files hold what must stay out of the repository; [.env.example](.env.example) lists both. `.env.local` holds the address that receives reports and nothing else, because the website's build copies it into the site it sends; the results page fails without `REPORT_EMAIL`. `.env.collect` holds the keys of the collection run.

## Site owner tasks

- [Put the site online](docs/deploy.md), and send it again after a change.
- [Hide a listing](docs/hide-a-listing.md) after a report email.
