// The hosted database's tables and first rows, sent from this machine (docs/deploy.md).
//   npm run hosted:schema    creates the tables of db/schema.sql that the hosted database does not have yet
//   npm run hosted:fill      copies the rows of the local database that the hosted one does not have yet
// Both can be run again at any time: neither changes a table or a row that is already there.
// With --preview they act on the copy `npm run preview` reads on this machine.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { LOCAL_DATABASE, openSqlite, type SqlValue } from "./db";
import { fileOnD1, HOSTED, onD1, PREVIEW } from "./wrangler";

// Listings, the posts already read (so that they are not read again) and the owner's hidden listings.
const TABLES = ["listings", "collected_posts", "hidden_listings"];

const literal = (value: SqlValue) =>
  value === null ? "NULL" : typeof value === "number" ? String(value) : `'${value.replaceAll("'", "''")}'`;

/** One statement per local row; a row whose link the hosted database already holds is left as it is there. */
async function localRows(): Promise<string[]> {
  const db = openSqlite(LOCAL_DATABASE, { readOnly: true });
  const statements: string[] = [];
  for (const table of TABLES) {
    for (const row of await db.all<Record<string, SqlValue>>(`SELECT * FROM ${table}`)) {
      const columns = Object.keys(row);
      statements.push(
        `INSERT OR IGNORE INTO ${table} (${columns.join(", ")}) VALUES (${columns.map((c) => literal(row[c] ?? null)).join(", ")});`,
      );
    }
  }
  return statements;
}

const [command, ...flags] = process.argv.slice(2);
const where = flags.includes("--preview") ? PREVIEW : HOSTED;

if (command === "schema") {
  // The same file the local database is created from, so the two cannot drift apart.
  fileOnD1(where, fileURLToPath(new URL("./schema.sql", import.meta.url)));
} else if (command === "fill") {
  const statements = await localRows();
  const folder = mkdtempSync(join(tmpdir(), "student-housing-"));
  try {
    const file = join(folder, "rows.sql");
    writeFileSync(file, statements.join("\n"));
    if (statements.length > 0) fileOnD1(where, file);
  } finally {
    rmSync(folder, { recursive: true });
  }
} else {
  throw new Error("Usage: tsx db/hosted.ts schema|fill [--preview]");
}

console.log(where === HOSTED ? "The hosted database now holds:" : "The preview copy on this machine now holds:");
console.table(onD1(where, `SELECT ${TABLES.map((table) => `(SELECT COUNT(*) FROM ${table}) AS ${table}`).join(", ")}`));
