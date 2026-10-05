import type { Extraction, GenderRestriction } from "../domain";

const UNREADABLE: Extraction = { offer: false, reason: "unreadable" };

// A monthly rent outside this range is a misreading (millimes, a sale price), not a price.
const MIN_PRICE = 30;
const MAX_PRICE = 20000;
const MAX_SIZE = 10;

function price(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  const rounded = Math.round(raw);
  return rounded >= MIN_PRICE && rounded <= MAX_PRICE ? rounded : null;
}

function size(raw: unknown): number | null {
  return typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw <= MAX_SIZE ? raw : null;
}

function parseOne(raw: unknown, knownIds: Set<string>): Extraction {
  if (typeof raw !== "object" || raw === null) return UNREADABLE;
  const r = raw as Record<string, unknown>;

  // Without a clear yes or no the entry is garbled: the post must be read again, not remembered as rejected.
  if (typeof r.offer !== "boolean") return UNREADABLE;
  if (!r.offer) return { offer: false, reason: r.reason === "demand" ? "demand" : "not_housing" };
  if (r.kind !== "rental" && r.kind !== "flatshare") return UNREADABLE;
  if (typeof r.neighbourhood !== "string" || !knownIds.has(r.neighbourhood)) {
    return { offer: false, reason: "no_neighbourhood" };
  }

  const genderRestriction: GenderRestriction = r.gender === "girls" || r.gender === "boys" ? r.gender : "unspecified";
  return {
    offer: true,
    facts: {
      kind: r.kind,
      price: price(r.price),
      neighbourhoodId: r.neighbourhood,
      size: size(r.size),
      furnished: typeof r.furnished === "boolean" ? r.furnished : null,
      genderRestriction,
    },
  };
}

/** Validates a model's JSON answer; a post the model skipped or garbled comes back as "unreadable". */
export function parseResults(json: string, count: number, knownIds: Set<string>): Extraction[] {
  let results: unknown;
  try {
    // Smaller models sometimes answer with the bare list instead of {"results": [...]}.
    const parsed = JSON.parse(json) as unknown;
    results = Array.isArray(parsed) ? parsed : (parsed as { results?: unknown } | null)?.results;
  } catch {
    return Array.from({ length: count }, () => UNREADABLE);
  }
  const byIndex = new Map<number, unknown>();
  if (Array.isArray(results)) {
    for (const r of results) {
      const i = (r as { i?: unknown } | null)?.i;
      if (typeof i === "number") byIndex.set(i, r);
    }
  }
  return Array.from({ length: count }, (_, i) => parseOne(byIndex.get(i), knownIds));
}
