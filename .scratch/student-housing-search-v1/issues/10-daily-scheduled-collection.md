# 10: Daily scheduled collection

**What to build:** Collection runs by itself once a day and keeps the live site current, without the site owner doing anything and without exceeding the free scraping credit or the free model quotas.

**Blocked by:** 03, 09

**Status:** ready-for-agent

- [ ] Collection runs once a day on a free scheduler and writes to the hosted database
- [ ] Only Facebook posts newer than the previous run are fetched, so the monthly scraping credit is not spent on posts already collected
- [ ] The number of posts fetched per run is capped so a month of runs stays inside the free scraping credit
- [ ] Extraction requests are batched and paced to stay inside the free model quotas
- [ ] One source failing does not stop the others, and the run reports which source failed
- [ ] Each run's log shows counts of offers, demands, unrelated posts and dropped posts per source
- [ ] Keys live only in the scheduler's secret store
- [ ] The owner can trigger a run by hand
- [ ] After a scheduled run, new listings are visible on the live site
