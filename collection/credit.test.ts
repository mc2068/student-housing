import { describe, expect, it } from "vitest";
import { dailyPostsPerGroup } from "./credit";
import { facebookGroups } from "./data";

// $5 of free scraping credit a month at the measured $0.005 a post (docs/adr/0001).
const POSTS_THE_CREDIT_PAYS_FOR = 1000;

describe("the daily share of the free scraping credit", () => {
  it("gives each of five groups its six newest posts", () => {
    expect(dailyPostsPerGroup(5)).toBe(6);
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 12, 30])(
    "keeps a 31-day month of daily runs, and two more by hand, inside the credit with %i groups",
    (groups) => {
      const postsPerRun = dailyPostsPerGroup(groups) * groups;

      expect(postsPerRun).toBeGreaterThan(0);
      expect((31 + 2) * postsPerRun).toBeLessThanOrEqual(POSTS_THE_CREDIT_PAYS_FOR);
    },
  );

  it("fits the groups listed today", () => {
    expect(33 * dailyPostsPerGroup(facebookGroups.length) * facebookGroups.length).toBeLessThanOrEqual(POSTS_THE_CREDIT_PAYS_FOR);
  });

  it("gives nothing when the groups are too many for one post each", () => {
    expect(dailyPostsPerGroup(31)).toBe(0);
  });
});
