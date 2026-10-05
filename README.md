# Student housing search

Student housing listings for Grand Tunis, collected from public Facebook groups and searched by faculty. The glossary is in [CONTEXT.md](CONTEXT.md); the decisions are in [docs/adr](docs/adr).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | The website, on the local database |
| `npm run collect` | One collection run into the local database (options at the top of `collection/run.ts`) |
| `npm run sql -- "<statement>"` | One SQL statement on the local database |
| `npm run evaluate` | Extraction accuracy on the evaluation set, by hand after a change of prompt or models (options at the top of `collection/extract/evaluate.ts`) |
| `npm test` | The tests; they never call a model |
| `npm run typecheck` | Type checking |

Keys and the address that receives reports go in `.env.local`; [.env.example](.env.example) lists them. The results page fails without `REPORT_EMAIL`.

The evaluation set is `proof/evaluation-set.json`. It holds real post texts, so it stays on the site owner's machine and is never committed ([ADR 0002](docs/adr/0002-store-facts-and-link-only.md)); `npm run evaluate` writes its report and a page to review the expected facts next to it.

## Site owner tasks

- [Hide a listing](docs/hide-a-listing.md) after a report email.
