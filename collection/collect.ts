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
  /** No model could read these, at either try; they are tried again on the next run. */
  unreadable: number;
  /** Among the posts read, those a last-resort model read; their facts are less sure. */
  byLastResort: number;
  /** Why the source returned nothing. */
  error?: string;
  /** Why the last of its unreadable posts could not be read by any model. */
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
  /** Wait before the second and last try, when the extractor failed a whole batch at the first. */
  secondTryAfterMs?: number;
  /** Told when the run is about to wait for that second try, so that a log does not look stuck. */
  log?: (line: string) => void;
}

/** The posts of one model request, and the wait between two requests, unless a run is told otherwise. */
export const BATCH_SIZE = 10;
export const PAUSE_MS = 5000;

/** A post no model has read yet. */
interface UnreadPost {
  post: CollectedPost;
  reason: string;
  /** The extractor failed its whole batch, which is the models refusing; otherwise its own entry was missing from an answer, or garbled. */
  batchFailed: boolean;
}

const NOT_IN_THE_ANSWER = "left out of a model's answer, or garbled in it";

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

/** An error as one short line, for a table or a log. */
export const errorLine = (err: unknown) => (err instanceof Error ? err.message : String(err)).replace(/\s+/g, " ").slice(0, 200);

const duration = (ms: number) => (ms >= 60_000 ? `${Math.round(ms / 60_000)} minutes` : `${Math.round(ms / 1000)} seconds`);

/**
 * One line for each thing that went wrong in a run, naming the source: a source that could not be
 * collected, or posts no model could read. The run itself went on; this is what the owner must see.
 */
export function failures(report: CollectionReport): string[] {
  return Object.entries(report).flatMap(([sourceId, counts]) => [
    ...(counts.error ? [`${sourceId}: its posts could not be collected (${counts.error})`] : []),
    ...(counts.unreadable > 0 ? [`${sourceId}: no model could read ${counts.unreadable} of its posts (${counts.extractionError})`] : []),
  ]);
}

/** One collection run: raw posts in from every source, listings out into the store. */
export async function runCollection(run: CollectionRun): Promise<CollectionReport> {
  const { sources, extractor, lastResort, store, now = new Date(), batchSize = BATCH_SIZE, pauseMs = PAUSE_MS, secondTryAfterMs = 5 * 60 * 1000, log } = run;
  const report: CollectionReport = {};
  const toRead: CollectedPost[] = [];
  const queued = new Set<string>();

  for (const source of sources) {
    const counts = (report[source.id] = emptyReport());
    let posts: RawPost[];
    try {
      posts = await source.collect();
    } catch (err) {
      // One source failing must not cost the others their day.
      counts.error = errorLine(err);
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
      toRead.push({ sourceId: source.id, url: post.url, text: stripPhoneNumbers(post.text), postedAt: post.postedAt });
    }
  }

  /** One batch through the extractor and, when it fails and there is one, through a fallback. */
  async function extract(texts: string[], fallback?: Extractor): Promise<{ extractions: Extraction[]; byLastResort: boolean }> {
    try {
      return { extractions: await extractor.extract(texts), byLastResort: false };
    } catch (err) {
      if (!fallback) throw err;
      return { extractions: await fallback.extract(texts), byLastResort: true };
    }
  }

  /**
   * Sends the posts to the models batch by batch and stores what comes back. Returns the posts no model
   * read: those of a batch the extractor (and the fallback, when given one) failed, and those a model
   * left out of its answer or garbled in it.
   */
  async function read(posts: CollectedPost[], fallback?: Extractor): Promise<UnreadPost[]> {
    const unread: UnreadPost[] = [];
    for (let start = 0; start < posts.length; start += batchSize) {
      if (start > 0 && pauseMs > 0) await sleep(pauseMs);
      const batch = posts.slice(start, start + batchSize);
      let extractions: Extraction[];
      let byLastResort: boolean;
      try {
        ({ extractions, byLastResort } = await extract(batch.map((post) => post.text), fallback));
      } catch (err) {
        const reason = errorLine(err);
        unread.push(...batch.map((post) => ({ post, reason, batchFailed: true })));
        continue;
      }
      for (const [i, post] of batch.entries()) {
        const extraction = extractions[i];
        if (!extraction || isUnreadable(extraction)) {
          unread.push({ post, reason: NOT_IN_THE_ANSWER, batchFailed: false });
          continue;
        }
        const counts = report[post.sourceId]!;
        await store.record(post, extraction, now);
        counts[COUNTER[outcomeOf(extraction)]]++;
        if (byLastResort) counts.byLastResort++;
      }
    }
    return unread;
  }

  // The posts are paid for and may be gone from a group's newest by the next run, so those left unread get
  // one second try, and the last-resort models with it. The free models are at times overloaded for minutes,
  // all of them at once: a failed batch is worth a patient wait, a post missing from an answer is not.
  let unread = await read(toRead);
  if (unread.length > 0) {
    const waitMs = unread.some(({ batchFailed }) => batchFailed) ? secondTryAfterMs : pauseMs;
    log?.(
      `No model read ${unread.length} post(s) (${unread[0]!.reason}). ` +
        `Trying once more in ${duration(waitMs)}${lastResort ? ", then with the last-resort models" : ""}.`,
    );
    await sleep(waitMs);
    unread = await read(unread.map(({ post }) => post), lastResort);
  }
  for (const { post, reason } of unread) {
    const counts = report[post.sourceId]!;
    counts.unreadable++;
    counts.extractionError = reason;
  }

  return report;
}
