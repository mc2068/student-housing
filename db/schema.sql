-- A listing is one post (its link is its identity). Nothing about the author is stored (docs/adr/0002).
CREATE TABLE IF NOT EXISTS listings (
  url TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('rental', 'flatshare')),
  price INTEGER,
  neighbourhood_id TEXT NOT NULL,
  size INTEGER,
  furnished INTEGER CHECK (furnished IN (0, 1)),
  gender_restriction TEXT NOT NULL CHECK (gender_restriction IN ('girls', 'boys', 'unspecified')),
  excerpt TEXT NOT NULL,
  posted_at TEXT NOT NULL,
  collected_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS listings_by_place_and_date ON listings (neighbourhood_id, posted_at);

-- Every post a model has read, listings and rejections alike, so it is never sent to a model twice.
CREATE TABLE IF NOT EXISTS collected_posts (
  url TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('listing', 'demand', 'not_housing', 'no_neighbourhood')),
  collected_at TEXT NOT NULL
);

-- Links of the listings the site owner has hidden, entered by hand (docs/hide-a-listing.md).
-- While a link is here, search never shows its listing and a collection run never reads its post.
CREATE TABLE IF NOT EXISTS hidden_listings (
  url TEXT PRIMARY KEY,
  hidden_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
