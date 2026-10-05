import { setTimeout as sleep } from "node:timers/promises";
import { type CollectedPost, type Extractor, isUnreadable, type Outcome, outcomeOf, type RawPost, type Source, VISIBLE_MS } from "./domain";
import { stripPhoneNumbers } from "./redact";
import type { Store } from "./store";

export interface SourceReport {
  collected: number;
  /** Older than the 14 days a listing stays visible, so not worth reading. */
  expired: number;
  alreadySeen: number;
  listings: number;
  demands: number;
  notHousing: number;
  noNeighbourhood: number;
  /** No model could read these; they are tried again on the next run. */
  unreadable: number;
  /** Why the source returned nothing. */
  error?: string;
  /** Why the last batch of its posts could not be read by any model. */
  extractionError?: string;
}

export type CollectionReport = Record<string, SourceReport>;

export interface CollectionRun {
  sources: Source[];
  extractor: Extractor;
  store: Store;
  now?: Date;
  /** Posts per model request. Free model quotas count requests, not posts. */
  batchSize?: number;
  /** Wait between model requests, to stay under the free tier's requests-per-minute limit. */
  pauseMs?: number;
}

// A new outcome fails to compile here until it has a counter.
const COUNTER = {
  listing: "listings",
  demand: "demands",
  not_housing: "notHousing",
  no_neighbourhood: "noNeighbourhood",
} as const satisfies Record<Outcome, keyof SourceReport>;

const emptyReport = (): SourceReport => ({
  collected: 0, expired: 0, alreadySeen: 0, listings: 0, demands: 0, notHousing: 0, noNeighbourhood: 0, unreadable: 0,
});

const message = (err: unknown) => (err instanceof Error ? err.message : String(err)).replace(/\s+/g, " ").slice(0, 200);

/** One collection run: raw posts in from every source, listings out into the store. */
export async function runCollection(run: CollectionRun): Promise<CollectionReport> {
  const { sources, extractor, store, now = new Date(), batchSize = 10, pauseMs = 5000 } = run;
  const report: CollectionReport = {};
  const unread: CollectedPost[] = [];
  const queued = new Set<string>();

  for (const source of sources) {
    const counts = (report[source.id] = emptyReport());
    let posts: RawPost[];
    try {
      posts = await source.collect();
    } catch (err) {
      // One source failing must not cost the others their day.
      counts.error = message(err);
      continue;
    }
    counts.collected = posts.length;

    const fresh = posts.filter((post) => now.getTime() - new Date(post.postedAt).getTime() <= VISIBLE_MS);
    counts.expired = posts.length - fresh.length;
    const seen = await store.seen(fresh.map((post) => post.url));
    for (const post of fresh) {
      if (seen.has(post.url) || queued.has(post.url)) {
        counts.alreadySeen++;
        continue;
      }
      queued.add(post.url);
      // Only these fields go on, with phone numbers masked: neither a model nor the store ever
      // receives a number, or anything else a source may have attached to the post.
      unread.push({ sourceId: source.id, url: post.url, text: stripPhoneNumbers(post.text), postedAt: post.postedAt });
    }
  }

  for (let start = 0; start < unread.length; start += batchSize) {
    if (start > 0 && pauseMs > 0) await sleep(pauseMs);
    const batch = unread.slice(start, start + batchSize);
    let failure: string | undefined;
    const extractions = await extractor.extract(batch.map((post) => post.text)).catch((err: unknown) => {
      failure = message(err);
      return null;
    });
    for (const [i, post] of batch.entries()) {
      const counts = report[post.sourceId]!;
      const extraction = extractions?.[i];
      if (!extraction || isUnreadable(extraction)) {
        counts.unreadable++;
        if (failure) counts.extractionError = failure;
        continue;
      }
      await store.record(post, extraction, now);
      counts[COUNTER[outcomeOf(extraction)]]++;
    }
  }

  return report;
}
