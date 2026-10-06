# Run the collection every day

For the site owner. Once these steps are done, GitHub starts a collection run every morning at about 06:17, Tunis time: it takes the newest posts of each Facebook group, has a model read them, and writes the offers to the hosted database the live site reads. Your machine does not need to be on.

The run and its schedule are in the repository (`.github/workflows/collect.yml`). The steps below are the ones only you can do, because they use your GitHub, Cloudflare, Apify and Google accounts.

Do [Put the site online](deploy.md) first, at least steps 1 to 5: the run writes to the hosted database, so it must exist, have its tables, and have its identifier in `wrangler.jsonc`.

## First time

Do these once, in order.

1. **Put the project on GitHub.**

   - Create an empty repository at <https://github.com/new> (no README, no licence). Private or public both work; see "Good to know" for the difference.
   - Send the project to it, with the address GitHub shows you:

     ```bash
     git remote add origin https://github.com/<you>/<repository>.git
     git push -u origin main
     ```

   The schedule only runs from the branch GitHub calls the default one, which is `main` after this push.

2. **Create a Cloudflare token for the run.** It is a key that lets the run write to your database and do nothing else on your account.

   - Open <https://dash.cloudflare.com/profile/api-tokens> > **Create Token** > **Create Custom Token** (**Get started**).
   - Name: `student-housing daily collection`.
   - Permissions: one line, **Account** | **D1** | **Edit**.
   - Account Resources: **Include** | your account.
   - Leave the rest empty (no zone, no address filter: GitHub's machines change address).
   - **Continue to summary** > **Create Token**. Copy the token now: Cloudflare shows it once.

3. **Find your Cloudflare account identifier.**

   ```bash
   npx wrangler whoami
   ```

   It is the 32-character value in the "Account ID" column. It is not a key, but it stays out of the repository's files all the same.

4. **Create an Apify token for the run**, separate from the one in `.env.collect`, so that either can be withdrawn without touching the other: Apify Console > **Settings** > **API & Integrations** (<https://console.apify.com/settings/integrations>) > **Create a new token**.

   You may limit what it can do: switch on **Limit token permissions**, give it **Run** on the Actor *Facebook Groups Scraper* (`apify/facebook-groups-scraper`), and leave its access to the default storages of the runs it starts switched on. This limit is described by Apify but was not tried here. If the first run fails with `Apify 403`, switch the limit off.

5. **Create a Gemini key for the run**: <https://aistudio.google.com/apikey> > **Create API key**, in the same project as the one in `.env.collect`. A Gemini key has no permissions to limit. Both keys draw on the same free daily quota, which belongs to the project.

6. **Give the four values to GitHub.** On the repository's page: **Settings** > **Secrets and variables** > **Actions** > **New repository secret**, four times, with exactly these names:

   | Name | Value |
   | --- | --- |
   | `CLOUDFLARE_API_TOKEN` | the token of step 2 |
   | `CLOUDFLARE_ACCOUNT_ID` | the identifier of step 3 |
   | `APIFY_API_KEY` | the token of step 4 |
   | `GEMINI_API_KEY` | the key of step 5 |

   GitHub never shows a secret again and hides it in logs. They are in no file of the project.

7. **Start a run by hand** (next section) and read its log. This first run is also the first time the project talks to Cloudflare's and GitHub's servers for real: nothing below could be tried without your accounts. If it fails, send the red lines of the log to the maintainer.

8. **Look at the live site.** Search around a faculty: the newest listings are from today.

## Start a run by hand

On the repository's page: **Actions** > **Daily collection** (left column) > **Run workflow** > choose how many posts to take from each group > **Run workflow**. The run appears in the list after a few seconds.

Or, from a terminal in the project folder, if you use GitHub's command-line tool:

```bash
gh workflow run collect.yml -f posts=2
gh run watch
```

A run by hand takes 2 posts from each group unless you choose another number, because it spends the same monthly scraping credit as the daily runs (see "What it spends").

## Read a run's log

**Actions** > the run > **Collection run** > **Collect, read and store**. It prints one line per Facebook group:

| Column | Meaning |
| --- | --- |
| `collected` | Posts the scraper returned. Each was paid for. |
| `expired` | Older than 14 days: not read. |
| `hidden` | You hid their listing: not read. |
| `alreadySeen` | Collected by an earlier run: recognised by their link and not read again. These were paid for twice. |
| `listings` | Offers stored. |
| `demands` | Posts by people looking for housing. |
| `notHousing` | Posts about something else. |
| `noNeighbourhood` | Offers naming no neighbourhood of the list: dropped. |
| `unreadable` | No model could read them, at either of the run's two tries. The run ends as failed. They are tried again if they are still among the group's newest tomorrow. |
| `byLastResort` | Among the posts read, those a smaller model read because the usual ones were down twice. Their facts are less sure. |

Then the number of listings the hosted database holds.

## When a run fails

GitHub marks the run with a red cross and, unless you turned that off in your notification settings, sends you an email. A run fails when:

- **A group could not be collected, or no model could read some posts.** The other groups and posts were still done. The run's page shows a red line that names the group, for example `fb-ariana-bawsla: its posts could not be collected (…)` or `fb-ariana-bawsla: no model could read 2 of its posts (…)`. Even one unread post makes the run fail: it was paid for, and in a busy group it is no longer among the newest the next day. One such day is nothing to act on. Several in a row for the same group: tell the maintainer; the group may have closed or the scraper changed.
- **`was still RUNNING after 5 minutes`, or `aborted due to timeout`.** A service took too long and the run stopped waiting for it: the scraper for one group (its posts are lost for the day, and still billed if the scraper finished later), a model (the next model was asked), or the database. Treat it like the line above.
- **An `Apify …` error on every group.** Most likely the month's free scraping credit is spent, or the token was withdrawn. Check <https://console.apify.com/billing>. With no payment card on the account nothing is charged; runs work again when the month's credit is renewed.
- **`Gemini 429` on every batch.** The day's free model quota is spent, usually by runs by hand or an evaluation the same day. Tomorrow's run works again.
- **`Gemini 503` on every batch.** Google's free models were overloaded, the smaller ones included. Nothing to do; if it happens most days, tell the maintainer: the hour of the run can be moved.
- **`Cloudflare D1 answered …`.** The run stopped before collecting anything, or while storing. A message about authentication: the token of step 2 is wrong or withdrawn. A message about a limit: the database's free daily allowance is spent; it is renewed at 01:00, Tunis time.
- **`wrangler.jsonc does not have the hosted database's identifier yet`.** Step 4 of [deploy.md](deploy.md) was not done or not sent to GitHub.

To run again after a failure, start a run by hand. **Re-run jobs** on a failed scheduled run also works, but takes the full daily share of posts.

## What it spends

Everything stays inside the free allowances, with these sums.

- **Scraping (Apify).** The free credit is $5 a month and a post costs $0.005, so 1,000 posts a month. 60 are kept for runs by hand; the other 940 over a 31-day month give 30 posts a day, which is **6 posts from each of the five groups**: 930 posts, $4.65. If you add or remove a group in `data/sources.json`, the share of each is worked out again so the month still fits (six groups get 5 each).
- **Runs by hand** come out of the 70 posts that are left: seven runs at 2 posts a group, or two at 6.
- **Posts paid for twice.** A run takes each group's newest posts whether or not it has seen them. A group that posted fewer than 6 times since the last run returns some posts again; they cost $0.005 each and are not read again. In the posts saved on 2026-10-04 this was 4 posts of 30, all from one group. The scraper can filter by date, but that adds $0.002 to every post, which costs more as long as fewer than 2 posts in 7 are repeats. The `alreadySeen` column shows the real figure every day.
- **Models (Gemini).** A run reads at most 30 new posts, 10 per request: 3 requests a day, of the 20 a day each of the three usual models allows for free.
- **Database (Cloudflare D1).** About 70 requests and 100 rows written a run, against 100,000 rows a day.
- **GitHub.** A run takes a few minutes of the 2,000 a month a private repository gets for free. A public repository is not counted. None of this was measured on GitHub; the sum below is from the waits written in the code.

  | Day | Time |
  | --- | --- |
  | Ordinary: five scraper runs, three model requests, about 70 database requests | A few minutes |
  | Every model refuses, and answers its refusal at once: 72 requests with 13 minutes of waits between them (20 seconds of retries per model and batch, five minutes before the second try) | About 25 minutes |
  | The same, with every scraper run also slow to its limit of five minutes | About 45 minutes |
  | Anything slower: GitHub stops the job, and its log has no counts | 60 minutes |

## Good to know

- **Private or public repository.** Nothing in the repository is secret, so either is safe. In a public repository GitHub switches a schedule off after 60 days without any change to the repository, and writes to you first: **Actions** > **Daily collection** > **Enable workflow** switches it back on. A private repository has no such rule.
- **The time of day.** 05:17 UTC, in `.github/workflows/collect.yml`. GitHub may start a few minutes late. On 2026-10-05 around 17:00, Tunis time, all three usual models refused as overloaded for more than ten minutes. The early morning was chosen in the hope that it is calmer; that is not measured.
- **When every usual model is down**, a run waits five minutes and tries the unread posts once more. Only if they fail again does it hand them to two smaller models, which get more facts wrong (ticket 02). The `byLastResort` column counts those posts.
- **When a model answers for a batch but leaves a post out**, or answers nonsense for it, the run asks once more for that post, without the five-minute wait. If it is still unread, it is counted as `unreadable` and the run ends as failed.
- **Your own runs still work.** `npm run collect` on your machine writes to the local database, as before, and spends the same Apify credit and Gemini quota.
- **`npm run hosted:fill` is no longer needed** once the daily run works. It stays safe to run: it never changes a line the hosted database already has.
- **To stop the daily run:** **Actions** > **Daily collection** > **…** > **Disable workflow**.
- **To withdraw a key:** delete the token where you created it (steps 2, 4 and 5), create a new one, and replace the secret's value in GitHub.
