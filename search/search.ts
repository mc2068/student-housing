import type { Faculty } from "../collection/data";
import { type GenderRestriction, type Kind, type ListingFacts, VISIBLE_MS } from "../collection/domain";
import type { Db } from "../db/db";

/** A listing as the site shows it: its facts, and where and when it was posted. */
export interface Listing extends ListingFacts {
  url: string;
  sourceId: string;
  excerpt: string;
  postedAt: string;
}

export interface SearchCriteria {
  facultyId: string;
}

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

/** The listings a student sees for these criteria: still visible, newest first. */
export async function searchListings(
  criteria: SearchCriteria,
  { db, faculties, now = new Date() }: SearchOptions,
): Promise<Listing[]> {
  const neighbourhoodIds = faculties.find((faculty) => faculty.id === criteria.facultyId)?.neighbourhoods ?? [];
  if (neighbourhoodIds.length === 0) return [];
  const rows = await db.all<ListingRow>(
    `SELECT url, source_id, kind, price, neighbourhood_id, size, furnished, gender_restriction, excerpt, posted_at
       FROM listings
      WHERE neighbourhood_id IN (${neighbourhoodIds.map(() => "?").join(", ")})
        AND posted_at >= ?
      ORDER BY posted_at DESC, url`,
    ...neighbourhoodIds,
    // The store writes every post date in the UTC form, which sorts as text in date order.
    new Date(now.getTime() - VISIBLE_MS).toISOString(),
  );
  return rows.map(toListing);
}
