import { getCloudflareContext } from "@opennextjs/cloudflare";
import { type D1Binding, openD1 } from "../db/d1";
import type { Db } from "../db/db";

declare global {
  // What wrangler.jsonc binds to the deployed site.
  interface CloudflareEnv {
    DB?: D1Binding;
  }
}

// Cloudflare's runtime gives itself this name; Node, which runs `npm run dev`, does not.
const onCloudflare = globalThis.navigator?.userAgent === "Cloudflare-Workers";

let local: Db | undefined;

/**
 * The database the site reads, and only reads: the hosted one when deployed on Cloudflare,
 * otherwise the local file a collection run fills (`npm run collect`).
 */
export async function database(): Promise<Db> {
  if (onCloudflare) {
    const d1 = getCloudflareContext().env.DB;
    if (!d1) throw new Error("Missing the DB binding (wrangler.jsonc)");
    return openD1(d1);
  }
  if (!local) {
    // Loaded only here: Node's SQLite does not exist on Cloudflare.
    const { LOCAL_DATABASE, openSqlite } = await import("../db/db");
    local = openSqlite(LOCAL_DATABASE, { readOnly: true });
  }
  return local;
}
