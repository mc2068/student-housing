import type { Faculty } from "../collection/data";
import { type GenderRestriction, type Kind, type ListingFacts, VISIBLE_MS } from "../collection/domain";
import type { Db, SqlValue } from "../db/db";

/** A listing as the site shows it: its facts, and where and when it was posted. */
export interface Listing extends ListingFacts {
  url: string;
  sourceId: string;
  excerpt: string;
  postedAt: string;
}

/** What narrows a search around a faculty. Every filter is optional and leaves the results alone when absent. */
export interface Filters {
  /** Rentals only or flatshares only; both when absent. */
  kind?: Kind;
  /** The most a flatshare may cost per person, in dinars a month; no limit when absent. */
  perPersonBudget?: number;
  /** The most a rental may cost for the whole unit, in dinars a month; no limit when absent. */
  wholeUnitBudget?: number;
  /** Who the student is; leaves out only listings restricted to the other gender. */
  gender?: Exclude<GenderRestriction, "unspecified">;
  /**
   * The sizes wanted, each the n in S+n with 0 for a studio; any size when absent or empty.
   * The largest size choice stands for that size or more.
   */
  sizes?: number[];
  /** Furnished only or unfurnished only; either when absent. */
  furnished?: boolean;
}

export interface SearchCriteria extends Filters {
  facultyId: string;
}

/** The sizes a student can choose from. The last one also covers every larger unit, which are rare. */
export const LARGEST_SIZE_CHOICE = 4;
export const SIZE_CHOICES = [0, 1, 2, 3, LARGEST_SIZE_CHOICE];

export interface SearchOptions {
  db: Db;
  faculties: Faculty[];
  now?: Date;
}

interface ListingRow {
  url: string;
  source_id: string;
  kind: Kind;
  price: number | null;
  neighbourhood_id: string;
  size: number | null;
  furnished: 0 | 1 | null;
  gender_restriction: GenderRestriction;
  excerpt: string;
  posted_at: string;
}

const toListing = (row: ListingRow): Listing => ({
  url: row.url,
  sourceId: row.source_id,
  kind: row.kind,
  price: row.price,
  neighbourhoodId: row.neighbourhood_id,
  size: row.size,
  furnished: row.furnished === null ? null : row.furnished === 1,
  genderRestriction: row.gender_restriction,
  excerpt: row.excerpt,
  postedAt: row.posted_at,
});

const placeholders = (values: unknown[]) => values.map(() => "?").join(", ");

/** The listings a student sees for these criteria: still visible, not hidden, newest first. */
export async function searchListings(
  criteria: SearchCriteria,
  { db, faculties, now = new Date() }: SearchOptions,
): Promise<Listing[]> {
  const neighbourhoodIds = faculties.find((faculty) => faculty.id === criteria.facultyId)?.neighbourhoods ?? [];
  if (neighbourhoodIds.length === 0) return [];

  const conditions: string[] = [];
  const params: SqlValue[] = [];
  const where = (condition: string, ...values: SqlValue[]) => {
    conditions.push(condition);
    params.push(...values);
  };

  where(`neighbourhood_id IN (${placeholders(neighbourhoodIds)})`, ...neighbourhoodIds);
  // The store writes every post date in the UTC form, which sorts as text in date order.
  where("posted_at >= ?", new Date(now.getTime() - VISIBLE_MS).toISOString());
  where("url NOT IN (SELECT url FROM hidden_listings)");
  if (criteria.kind) where("kind = ?", criteria.kind);
  // A listing without a price never passes "price <= ?", so a budget leaves it out, for its own kind only.
  if (criteria.perPersonBudget !== undefined) where("(kind <> 'flatshare' OR price <= ?)", criteria.perPersonBudget);
  if (criteria.wholeUnitBudget !== undefined) where("(kind <> 'rental' OR price <= ?)", criteria.wholeUnitBudget);
  if (criteria.gender) where("gender_restriction IN (?, 'unspecified')", criteria.gender);
  // A listing that does not state its size or furnishing is still shown; its card says so.
  const sizes = criteria.sizes ?? [];
  if (sizes.length > 0) {
    const orMore = sizes.includes(LARGEST_SIZE_CHOICE) ? ` OR size > ${LARGEST_SIZE_CHOICE}` : "";
    where(`(size IS NULL OR size IN (${placeholders(sizes)})${orMore})`, ...sizes);
  }
  if (criteria.furnished !== undefined) where("(furnished IS NULL OR furnished = ?)", criteria.furnished ? 1 : 0);

  const rows = await db.all<ListingRow>(
    `SELECT url, source_id, kind, price, neighbourhood_id, size, furnished, gender_restriction, excerpt, posted_at
       FROM listings
      WHERE ${conditions.join("\n        AND ")}
      ORDER BY posted_at DESC, url`,
    ...params,
  );
  return rows.map(toListing);
}
