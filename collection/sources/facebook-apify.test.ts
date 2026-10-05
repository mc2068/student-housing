import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { toRawPost } from "./facebook-apify";

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
