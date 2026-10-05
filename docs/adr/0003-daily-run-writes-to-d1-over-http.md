# The daily collection run writes to the hosted database over D1's HTTP API

The daily collection run happens on GitHub Actions, outside Cloudflare, where the website's own access to the database (a Worker binding) does not exist. It writes through D1's HTTP API, one request per statement, behind the same small database interface the tests and the website use, with a Cloudflare token allowed to edit D1 and nothing else.

Cloudflare describes that API as best suited to administrative use, because it falls under the account-wide limit of 1,200 requests in five minutes. A run makes about 70 requests (two per group to recognise posts already collected, two per post read), so the limit is far away. The price is one more key in the schedule's secret store, and no transaction: the store already writes a listing before its read post so that a run dying in between repeats work and doubles nothing.

## Considered options

- **A write address on the website's Worker**: no Cloudflare token outside Cloudflare, rejected because it puts a public address that writes on a site that otherwise only reads, guarded by a shared secret we would have to check ourselves, and inside the free plan's 10 ms of processor time per request.
- **Cloudflare's command-line tool from the job**: what the owner's manual commands use. One process and a second or two per statement, and no bound values, so every post link would be pasted into SQL text.
- **The whole run inside a scheduled Worker**: no second platform, rejected because the free plan allows a Worker 50 database queries and 50 outside requests each time it runs, and a collection run needs more of both (two queries per post read, and it asks the scraper again and again while it works).

## Consequences

- The HTTP client is tested against the answer shape Cloudflare documents and against a local D1 standing in for Cloudflare's side. It has not met the real service until the owner's first run.
- D1 lets one statement bind 100 values. Only one statement binds a value per post: the one that asks which links the database already holds. The store sends it 100 links at a time, so a source may return any number of posts. A local D1 enforces the limit, and a test runs that statement on it with 250 links.
- A run reading more than about 500 posts within five minutes would meet the account-wide request limit and need its statements grouped (the API takes a batch); nothing near that is planned.
