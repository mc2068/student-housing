// What wrangler.jsonc, the site's configuration on Cloudflare, says about the hosted database. Its name and
// its identifier are written there and read from there; neither is a key.
import { readFileSync } from "node:fs";

function configured(key: "database_name" | "database_id"): string | undefined {
  const config = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  return new RegExp(`"${key}":\\s*"([^"]+)"`).exec(config)?.[1];
}

/** The hosted database's name on Cloudflare. */
export function hostedDatabaseName(): string {
  const name = configured("database_name");
  if (!name) throw new Error("wrangler.jsonc does not name the hosted database.");
  return name;
}

/** The hosted database's identifier. It fails while the file still holds the zeros the owner replaces. */
export function hostedDatabaseId(): string {
  const id = configured("database_id");
  if (!id || /^[0-]+$/.test(id)) {
    throw new Error("wrangler.jsonc does not have the hosted database's identifier yet (docs/deploy.md, step 4).");
  }
  return id;
}
