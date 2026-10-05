import { setTimeout as sleep } from "node:timers/promises";
import type { RawPost, Source } from "../domain";

// Apify's own "Facebook Groups Scraper": public groups only, no login or cookies (docs/adr/0001).
// Third-party scrapers that rely on Apify Proxy fail on the free plan, where proxy access is blocked.
const ACTOR = "apify~facebook-groups-scraper";
const API = "https://api.apify.com/v2";

interface ScrapedItem {
  url?: string;
  text?: string;
  time?: string;
  sharedPost?: { text?: string };
}

/** Keeps only what a listing may store; the author, the profile and the images are dropped here (docs/adr/0002). */
export function toRawPost(item: ScrapedItem): RawPost | null {
  // Many group posts are shares of another post: their own text is empty and the offer is in the shared one.
  const text = item.text?.trim() || item.sharedPost?.text?.trim();
  if (!item.url || !text || !item.time) return null;
  const postedAt = new Date(item.time);
  if (Number.isNaN(postedAt.getTime())) return null;
  return { url: item.url, text, postedAt: postedAt.toISOString() };
}

async function apify<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Apify ${res.status} on ${path}: ${await res.text()}`);
  return (await res.json()) as T;
}

/**
 * One public group as a source: its newest posts, up to maxPosts. The scraper bills about $0.005
 * a post, so maxPosts is the group's budget for the run. Its date filter is not used: it adds
 * $0.002 a post, and posts already read are recognised by their link anyway.
 */
export function facebookSource(token: string, group: { id: string; url: string }, maxPosts: number): Source {
  return {
    id: group.id,
    async collect() {
      const started = await apify<{ data: { id: string; defaultDatasetId: string } }>(token, `/acts/${ACTOR}/runs`, {
        method: "POST",
        body: JSON.stringify({ startUrls: [{ url: group.url }], resultsLimit: maxPosts, viewOption: "CHRONOLOGICAL" }),
      });
      for (;;) {
        await sleep(5000);
        const { status } = (await apify<{ data: { status: string } }>(token, `/actor-runs/${started.data.id}`)).data;
        if (status === "SUCCEEDED") break;
        if (status !== "READY" && status !== "RUNNING") throw new Error(`Apify run ${started.data.id} ended as ${status}`);
      }
      const items = await apify<ScrapedItem[]>(token, `/datasets/${started.data.defaultDatasetId}/items?clean=true`);
      return items.map(toRawPost).filter((post): post is RawPost => post !== null);
    },
  };
}
