// One SQL statement on the local database, for the site owner's manual entries (docs/hide-a-listing.md).
//   npm run sql -- "SELECT url, hidden_at FROM hidden_listings"
import { applySchema, LOCAL_DATABASE, openSqlite } from "./db";

const statement = process.argv[2]?.trim().replace(/;$/, "");
// Only the first of several statements would run, without a word about the rest.
if (!statement || process.argv.length > 3 || statement.includes(";")) {
  throw new Error('Usage: npm run sql -- "<one SQL statement, in double quotes>"');
}

const db = openSqlite(LOCAL_DATABASE);
// A database last written before a table was added gets it here.
await applySchema(db);

const rows = await db.all<Record<string, unknown>>(statement);
if (rows.length > 0) console.table(rows);
// A statement that changes the database returns no rows either.
const changes = /^(insert|update|delete)\b/i.test(statement);
console.log(changes ? "Done." : `${rows.length} ${rows.length === 1 ? "row" : "rows"}.`);
