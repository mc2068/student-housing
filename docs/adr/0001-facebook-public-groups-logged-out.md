# Facebook is collected logged-out, from public groups only, through a managed scraper

Facebook is where most student flatshares are posted, so it is a required source, but it has no API for group posts and fights scraping. We collect only from a short hand-picked list of public groups, without any Facebook account, using a managed scraper (Apify) inside its free monthly credit.

Logged-out collection of public posts is the defensible side of Meta's terms (Meta v. Bright Data, N.D. Cal. 2024); a logged-in account breaks them and can be banned overnight, taking the pipeline with it. A managed scraper costs coverage (about 1,000 posts a month on the free credit, measured at $0.005 per post, against roughly 170 posts a day in the largest group alone) but means we do not maintain a scraper against Facebook's layout changes and login walls. Only Apify's own scraper works on the free plan; third-party ones depend on Apify Proxy, which the free plan blocks.

## Considered options

- **Private groups with a dedicated account**: more listings, rejected for the ban and terms risk.
- **Marketplace**: structured data, rejected for heavier defences and mostly non-student listings.
- **Our own scraper on a cloud browser (Browserbase)**: the free plan is one browser hour a month, too little for a daily job.
- **Our own scraper on a home machine**: free and uncapped, rejected for v1 because it only runs when the machine is on and breaks whenever Facebook changes. It remains the fallback if the free credit proves too small.
