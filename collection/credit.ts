// The free scraping credit, counted in posts. Measured in the pipeline proof: Apify's scraper bills
// $0.005 a post, so the free $5 a month pays for 1,000 posts (docs/adr/0001).
const POSTS_A_MONTH = 1000;
// Kept back each month for the runs the site owner starts by hand.
const KEPT_FOR_RUNS_BY_HAND = 60;
const DAYS_IN_THE_LONGEST_MONTH = 31;

/**
 * How many of its newest posts each Facebook group gives a daily run, so that a month of daily runs
 * stays inside the credit however many groups data/sources.json lists. With five groups: 940 posts
 * over 31 days is 30 a day, 6 a group, 930 a month.
 */
export function dailyPostsPerGroup(groups: number): number {
  return Math.floor((POSTS_A_MONTH - KEPT_FOR_RUNS_BY_HAND) / DAYS_IN_THE_LONGEST_MONTH / groups);
}
