import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { facebookSource, toRawPost } from "./facebook-apify";

// The structure of three real items from the scraper (a plain post, a share, an image-only post),
// with every value replaced by a made-up one.
const sample = JSON.parse(readFileSync(new URL("./facebook-apify.sample.json", import.meta.url), "utf8")) as object[];
const [plain, share, imageOnly] = sample.map((item) => toRawPost(item));

describe("toRawPost on the scraper's real output", () => {
  it("keeps exactly the link, the text and the date", () => {
    expect(plain).toEqual({
      url: "https://www.facebook.com/groups/1000000000000001/permalink/2000000000000001/",
      text: "Colocation pour filles, une place dans un S+2 meublé à El Manar 2, 350dt",
      postedAt: "2026-10-04T19:32:34.000Z",
    });
  });

  it("reads the shared post's text when the post itself has none, under the group post's own link and date", () => {
    expect(share).toEqual({
      url: "https://www.facebook.com/groups/1000000000000001/permalink/2000000000000002/",
      text: "À louer un appartement S+1 au Bardo, 800dt",
      postedAt: "2026-10-04T18:10:05.000Z",
    });
  });

  it("skips an image-only post", () => {
    expect(imageOnly).toBeNull();
  });

  it("carries nothing about authors, pages or images", () => {
    expect(JSON.stringify([plain, share])).not.toMatch(/Sample (Author|Sharer|Agency)|scontent|deep_link|profile/);
  });

  it("skips a post without a link or with an unreadable date", () => {
    expect(toRawPost({ text: "t", time: "2026-10-01T10:00:00.000Z" })).toBeNull();
    expect(toRawPost({ url: "u", text: "t", time: "not a date" })).toBeNull();
  });
});

describe("a Facebook group as a source", () => {
  afterEach(() => vi.unstubAllGlobals());

  const GROUP = { id: "fb-a", url: "https://www.facebook.com/groups/1000000000000001" };

  /** Apify's side, played here: a scraper run is started, asked how it is doing, then asked for its items. */
  function apify(statusOfRun: (timesAsked: number) => string) {
    let timesAsked = 0;
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.endsWith("/runs")) return Response.json({ data: { id: "run-1", defaultDatasetId: "dataset-1" } });
      if (url.endsWith("/actor-runs/run-1")) return Response.json({ data: { status: statusOfRun(++timesAsked) } });
      return Response.json(sample);
    });
  }

  it("waits for the scraper run to finish and returns its posts", async () => {
    apify((timesAsked) => (timesAsked < 3 ? "RUNNING" : "SUCCEEDED"));

    const posts = await facebookSource("token", GROUP, 6, { pollMs: 0 }).collect();

    expect(posts).toEqual([plain, share]);
  });

  it("gives up on a scraper run that does not finish in time, so that the other sources get their turn", async () => {
    apify(() => "RUNNING");

    await expect(facebookSource("token", GROUP, 6, { pollMs: 1, runLimitMs: 20 }).collect()).rejects.toThrow(/run-1 was still RUNNING/);
  });
});
