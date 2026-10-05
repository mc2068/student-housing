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

Keys and the address that receives reports go in `.env.local`; [.env.example](.env.example) lists them. The results page fails without `REPORT_EMAIL`.

## Site owner tasks

- [Hide a listing](docs/hide-a-listing.md) after a report email.
