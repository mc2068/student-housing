# Student housing search

Student housing listings for Grand Tunis, collected from public Facebook groups and searched by faculty. The glossary is in [CONTEXT.md](CONTEXT.md); the decisions are in [docs/adr](docs/adr).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | The website, on the local database |
| `npm run collect` | One collection run into the local database (options at the top of `collection/run.ts`) |
| `npm run collect:hosted` | The same run into the hosted database, as GitHub starts it every day; its keys come from the environment |
| `npm run sql -- "<statement>"` | One SQL statement on the local database |
| `npm run evaluate` | Extraction accuracy on the evaluation set, by hand after a change of prompt or models (options at the top of `collection/extract/evaluate.ts`) |
| `npm test` | The tests; they never call a model |
| `npm run typecheck` | Type checking |
| `npm run preview` | The website as built for Cloudflare, served on this machine from a copy of the local database |
| `npm run deploy` | Builds the website and sends it to Cloudflare |
| `npm run hosted:schema` | Creates the hosted database's tables from `db/schema.sql` |
| `npm run hosted:fill` | Copies the local database's rows to the hosted database |
| `npm run hosted:sql -- "<statement>"` | One SQL statement on the hosted database |

The last four act on the site owner's Cloudflare account and need `npx wrangler login` first.

Two files hold what must stay out of the repository; [.env.example](.env.example) lists both. `.env.local` holds the address that receives reports and nothing else, because the website's build copies it into the site it sends; the results page fails without `REPORT_EMAIL`. `.env.collect` holds the keys of the collection run. The daily run on GitHub (`.github/workflows/collect.yml`) reads its keys from the repository's secrets.

The evaluation set is `proof/evaluation-set.json`. It holds real post texts, so it stays on the site owner's machine and is never committed ([ADR 0002](docs/adr/0002-store-facts-and-link-only.md)); `npm run evaluate` writes its scores (`proof/evaluation-scores.txt`) and a page to review the expected facts next to it.

## Site owner tasks

- [Put the site online](docs/deploy.md), and send it again after a change.
- [Run the collection every day](docs/daily-collection.md): the keys to create, how to start a run by hand, and what a failed run means.
- [Hide a listing](docs/hide-a-listing.md) after a report email.
