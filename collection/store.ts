import { applySchema, type Db, type SqlValue } from "../db/db";
import { type CollectedPost, outcomeOf, type ReadExtraction } from "./domain";
import { excerpt } from "./redact";

export interface Store {
  /** Which of these posts a model has already read, in this run or an earlier one. */
  seen(urls: string[]): Promise<Set<string>>;
  /** Which of these posts the site owner has hidden the link of, so that they are neither read nor stored. */
  hidden(urls: string[]): Promise<Set<string>>;
  /** Remembers that a post was read and, when it is an offer, stores its listing. */
  record(post: CollectedPost, extraction: ReadExtraction, collectedAt: Date): Promise<void>;
}

// The listing's columns, in one place: the statement below is built from this list.
const LISTING_COLUMNS = [
  "url", "source_id", "kind", "price", "neighbourhood_id", "size", "furnished",
  "gender_restriction", "excerpt", "posted_at", "collected_at",
] as const;
type ListingRow = Record<(typeof LISTING_COLUMNS)[number], SqlValue>;

const SAVE_LISTING = `INSERT INTO listings (${LISTING_COLUMNS.join(", ")})
  VALUES (${LISTING_COLUMNS.map(() => "?").join(", ")})
  ON CONFLICT(url) DO UPDATE SET ${LISTING_COLUMNS.slice(1).map((c) => `${c} = excluded.${c}`).join(", ")}`;

export async function createStore(db: Db): Promise<Store> {
  await applySchema(db);

  /** Which of these links the table holds. */
  async function linksIn(table: "collected_posts" | "hidden_listings", urls: string[]): Promise<Set<string>> {
    if (urls.length === 0) return new Set();
    const rows = await db.all<{ url: string }>(
      `SELECT url FROM ${table} WHERE url IN (${urls.map(() => "?").join(", ")})`,
      ...urls,
    );
    return new Set(rows.map((row) => row.url));
  }

  return {
    seen: (urls) => linksIn("collected_posts", urls),
    hidden: (urls) => linksIn("hidden_listings", urls),

    async record(post, extraction, collectedAt) {
      const collected_at = collectedAt.toISOString();
      // The listing goes first: if the run dies in between, the post is read again next time and
      // the listing is written over, not doubled.
      if (extraction.offer) {
        const { facts } = extraction;
        const row: ListingRow = {
          url: post.url,
          source_id: post.sourceId,
          kind: facts.kind,
          price: facts.price,
          neighbourhood_id: facts.neighbourhoodId,
          size: facts.size,
          furnished: facts.furnished === null ? null : Number(facts.furnished),
          gender_restriction: facts.genderRestriction,
          excerpt: excerpt(post.text),
          // Always the UTC form: search compares and sorts post dates as text.
          posted_at: new Date(post.postedAt).toISOString(),
          collected_at,
        };
        await db.run(SAVE_LISTING, ...LISTING_COLUMNS.map((column) => row[column]));
      }
      await db.run(
        `INSERT INTO collected_posts (url, source_id, outcome, collected_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(url) DO UPDATE SET outcome = excluded.outcome, collected_at = excluded.collected_at`,
        post.url,
        post.sourceId,
        outcomeOf(extraction),
        collected_at,
      );
    },
  };
}
