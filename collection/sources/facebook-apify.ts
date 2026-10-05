import { setTimeout as sleep } from "node:timers/promises";
import type { RawPost, Source } from "../domain";

// Apify's own "Facebook Groups Scraper": public groups only, no login or cookies (docs/adr/0001).
// Third-party scrapers that rely on Apify Proxy fail on the free plan, where proxy access is blocked.
const ACTOR = "apify~facebook-groups-scraper";
const API = "https://api.apify.com/v2";

// Time limits, so that one stuck group fails by name and the run goes on to the others: the daily job has
// a limit of its own (.github/workflows/collect.yml), and a job stopped by it prints no counts.
// How long a scraper run takes was never measured; a few posts of one group should be far inside five minutes.
// A run given up on goes on at Apify, and its posts are billed all the same.
const REQUEST_LIMIT_MS = 30_000;
const RUN_LIMIT_MS = 5 * 60_000;
const POLL_MS = 5000;

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
    signal: AbortSignal.timeout(REQUEST_LIMIT_MS),
  });
  if (!res.ok) throw new Error(`Apify ${res.status} on ${path}: ${await res.text()}`);
  return (await res.json()) as T;
}

/**
 * One public group as a source: its newest posts, up to maxPosts. The scraper bills about $0.005
 * a post, so maxPosts is the group's budget for the run. Its date filter is not used: it adds
 * $0.002 a post, and posts already read are recognised by their link anyway.
 * The scraper is asked every `pollMs` whether it has finished, for `runLimitMs` at most.
 */
export function facebookSource(
  token: string,
  group: { id: string; url: string },
  maxPosts: number,
  { pollMs = POLL_MS, runLimitMs = RUN_LIMIT_MS } = {},
): Source {
  return {
    id: group.id,
    async collect() {
      const started = await apify<{ data: { id: string; defaultDatasetId: string } }>(token, `/acts/${ACTOR}/runs`, {
        method: "POST",
        body: JSON.stringify({ startUrls: [{ url: group.url }], resultsLimit: maxPosts, viewOption: "CHRONOLOGICAL" }),
      });
      const giveUpAt = Date.now() + runLimitMs;
      for (;;) {
        await sleep(pollMs);
        const { status } = (await apify<{ data: { status: string } }>(token, `/actor-runs/${started.data.id}`)).data;
        if (status === "SUCCEEDED") break;
        if (status !== "READY" && status !== "RUNNING") throw new Error(`Apify run ${started.data.id} ended as ${status}`);
        if (Date.now() >= giveUpAt) {
          throw new Error(`Apify run ${started.data.id} was still ${status} after ${Math.round(runLimitMs / 60_000)} minutes`);
        }
      }
      const items = await apify<ScrapedItem[]>(token, `/datasets/${started.data.defaultDatasetId}/items?clean=true`);
      return items.map(toRawPost).filter((post): post is RawPost => post !== null);
    },
  };
}
