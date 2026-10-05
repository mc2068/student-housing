import { setTimeout as sleep } from "node:timers/promises";
import { type CollectedPost, type Extraction, type Extractor, isUnreadable, type Outcome, outcomeOf, type RawPost, type Source, VISIBLE_MS } from "./domain";
import { stripPhoneNumbers } from "./redact";
import type { Store } from "./store";

export interface SourceReport {
  collected: number;
  /** Older than the 14 days a listing stays visible, so not worth reading. */
  expired: number;
  /** Their listing was hidden by the site owner, so they are never read again. */
  hidden: number;
  alreadySeen: number;
  listings: number;
  demands: number;
  notHousing: number;
  noNeighbourhood: number;
  /** No model could read these; they are tried again on the next run. */
  unreadable: number;
  /** Among the posts read, those a last-resort model read; their facts are less sure. */
  byLastResort: number;
  /** Why the source returned nothing. */
  error?: string;
  /** Why the last batch of its posts could not be read by any model. */
  extractionError?: string;
}

export type CollectionReport = Record<string, SourceReport>;

export interface CollectionRun {
  sources: Source[];
  extractor: Extractor;
  /**
   * Weaker models, asked only for a batch the extractor has failed twice, some minutes apart: a day's
   * posts read less well are worth more than the same posts paid for and lost.
   */
  lastResort?: Extractor;
  store: Store;
  now?: Date;
  /** Posts per model request. Free model quotas count requests, not posts. */
  batchSize?: number;
  /** Wait between model requests, to stay under the free tier's requests-per-minute limit. */
  pauseMs?: number;
  /** Wait before the batches the extractor could not read are tried a second and last time. */
  secondTryAfterMs?: number;
  /** Told when the run is about to wait for that second try, so that a log does not look stuck. */
  log?: (line: string) => void;
}

// A new outcome fails to compile here until it has a counter.
const COUNTER = {
  listing: "listings",
  demand: "demands",
  not_housing: "notHousing",
  no_neighbourhood: "noNeighbourhood",
} as const satisfies Record<Outcome, keyof SourceReport>;

const emptyReport = (): SourceReport => ({
  collected: 0, expired: 0, hidden: 0, alreadySeen: 0, listings: 0, demands: 0, notHousing: 0, noNeighbourhood: 0, unreadable: 0, byLastResort: 0,
});

const message = (err: unknown) => (err instanceof Error ? err.message : String(err)).replace(/\s+/g, " ").slice(0, 200);

/**
 * One line for each thing that went wrong in a run, naming the source: a source that could not be
 * collected, or posts no model could read. The run itself went on; this is what the owner must see.
 */
export function failures(report: CollectionReport): string[] {
  return Object.entries(report).flatMap(([sourceId, counts]) => [
    ...(counts.error ? [`${sourceId}: its posts could not be collected (${counts.error})`] : []),
    ...(counts.extractionError ? [`${sourceId}: no model could read a batch of its posts (${counts.extractionError})`] : []),
  ]);
}

/** One collection run: raw posts in from every source, listings out into the store. */
export async function runCollection(run: CollectionRun): Promise<CollectionReport> {
  const { sources, extractor, lastResort, store, now = new Date(), batchSize = 10, pauseMs = 5000, secondTryAfterMs = 5 * 60 * 1000, log } = run;
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
    const urls = fresh.map((post) => post.url);
    const hidden = await store.hidden(urls);
    const seen = await store.seen(urls);
    for (const post of fresh) {
      if (hidden.has(post.url)) {
        counts.hidden++;
        continue;
      }
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

  /** One batch through the extractor and, on the last try only, through the last-resort models when it fails. */
  async function extract(texts: string[], lastTry: boolean): Promise<{ extractions: Extraction[]; byLastResort: boolean }> {
    try {
      return { extractions: await extractor.extract(texts), byLastResort: false };
    } catch (err) {
      if (!lastTry || !lastResort) throw err;
      return { extractions: await lastResort.extract(texts), byLastResort: true };
    }
  }

  /** Sends the posts to the models batch by batch and stores what comes back. Returns the batches no model could read. */
  async function read(posts: CollectedPost[], lastTry: boolean): Promise<{ batch: CollectedPost[]; failure: string }[]> {
    const failed: { batch: CollectedPost[]; failure: string }[] = [];
    for (let start = 0; start < posts.length; start += batchSize) {
      if (start > 0 && pauseMs > 0) await sleep(pauseMs);
      const batch = posts.slice(start, start + batchSize);
      let extractions: Extraction[];
      let byLastResort: boolean;
      try {
        ({ extractions, byLastResort } = await extract(batch.map((post) => post.text), lastTry));
      } catch (err) {
        failed.push({ batch, failure: message(err) });
        continue;
      }
      for (const [i, post] of batch.entries()) {
        const counts = report[post.sourceId]!;
        const extraction = extractions[i];
        if (!extraction || isUnreadable(extraction)) {
          counts.unreadable++;
          continue;
        }
        await store.record(post, extraction, now);
        counts[COUNTER[outcomeOf(extraction)]]++;
        if (byLastResort) counts.byLastResort++;
      }
    }
    return failed;
  }

  // The free models are at times overloaded for minutes, all of them at once. The posts are paid for and
  // may be gone from a group's newest by the next run, so a failed batch gets one patient second try.
  let failed = await read(unread, false);
  if (failed.length > 0) {
    log?.(
      `No model could read ${failed.length} batch(es) of posts (${failed[0]!.failure}). ` +
        `Trying once more in ${Math.round(secondTryAfterMs / 60000)} minutes${lastResort ? ", then with the last-resort models" : ""}.`,
    );
    await sleep(secondTryAfterMs);
    failed = await read(failed.flatMap(({ batch }) => batch), true);
  }
  for (const { batch, failure } of failed) {
    for (const post of batch) {
      const counts = report[post.sourceId]!;
      counts.unreadable++;
      counts.extractionError = failure;
    }
  }

  return report;
}
