/** A post as a source returns it. It never carries the author or images (docs/adr/0002). */
export interface RawPost {
  url: string;
  text: string;
  postedAt: string;
}

/** A post once the collection run knows which source it came from. */
export interface CollectedPost extends RawPost {
  sourceId: string;
}

/** A site or Facebook group that posts are collected from. */
export interface Source {
  id: string;
  collect(): Promise<RawPost[]>;
}

export type Kind = "rental" | "flatshare";
export type GenderRestriction = "girls" | "boys" | "unspecified";

export interface ListingFacts {
  kind: Kind;
  /** Monthly price in dinars: per person for a flatshare, whole unit for a rental. */
  price: number | null;
  neighbourhoodId: string;
  /** The n in S+n; 0 for a studio. */
  size: number | null;
  furnished: boolean | null;
  genderRestriction: GenderRestriction;
}

/** Why a post that a model read did not become a listing. */
export type Rejection = "demand" | "not_housing" | "no_neighbourhood";

export type Extraction =
  | { offer: true; facts: ListingFacts }
  | { offer: false; reason: Rejection }
  /** The model gave nothing usable for this post; it is tried again on the next collection run. */
  | { offer: false; reason: "unreadable" };

export type ReadExtraction = Exclude<Extraction, { reason: "unreadable" }>;

/** What became of a post a model read. */
export type Outcome = "listing" | Rejection;

export const isUnreadable = (e: Extraction): e is { offer: false; reason: "unreadable" } =>
  !e.offer && e.reason === "unreadable";

export const outcomeOf = (e: ReadExtraction): Outcome => (e.offer ? "listing" : e.reason);

/** Turns a batch of post texts into one extraction per post, in the same order. */
export interface Extractor {
  name: string;
  extract(texts: string[]): Promise<Extraction[]>;
}
