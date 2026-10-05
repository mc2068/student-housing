// One SQL statement, for the site owner's manual entries (docs/hide-a-listing.md).
//   npm run sql -- "SELECT url, hidden_at FROM hidden_listings"           on the local database
//   npm run hosted:sql -- "SELECT url, hidden_at FROM hidden_listings"    on the hosted database, the live site's
import { applySchema, LOCAL_DATABASE, openSqlite } from "./db";
import { HOSTED, onD1, PREVIEW } from "./wrangler";

const FLAGS = ["--hosted", "--preview"];
const args = process.argv.slice(2).filter((arg) => !FLAGS.includes(arg));
// `npm run hosted:sql -- --preview "…"` acts on the copy `npm run preview` reads on this machine.
const d1 = process.argv.includes("--preview") ? PREVIEW : process.argv.includes("--hosted") ? HOSTED : undefined;

const statement = args[0]?.trim().replace(/;$/, "");
// Only the first of several statements would run locally, without a word about the rest; the hosted
// database would run them all.
if (!statement || args.length > 1 || statement.includes(";")) {
  throw new Error('Usage: npm run sql -- "<one SQL statement, in double quotes>"');
}

let rows: Record<string, unknown>[];
if (d1) {
  rows = onD1(d1, statement);
} else {
  const db = openSqlite(LOCAL_DATABASE);
  // A database last written before a table was added gets it here.
  await applySchema(db);
  rows = await db.all<Record<string, unknown>>(statement);
}

if (rows.length > 0) console.table(rows);
// A statement that changes the database returns no rows either.
const changes = /^(insert|update|delete)\b/i.test(statement);
console.log(changes ? "Done." : `${rows.length} ${rows.length === 1 ? "row" : "rows"}.`);
