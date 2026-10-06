import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

export type SqlValue = string | number | null;

/**
 * The few database operations the project needs. The spec puts the hosted database on Cloudflare D1
 * and the tests on local SQLite, so the SQL is written once against this and each database adapts to it.
 */
export interface Db {
  exec(sql: string): Promise<void>;
  run(sql: string, ...params: SqlValue[]): Promise<void>;
  all<T>(sql: string, ...params: SqlValue[]): Promise<T[]>;
}

/** The most values one statement may bind: Cloudflare D1's limit. Local SQLite takes thousands, so only D1 shows a statement over it. */
export const MAX_BOUND_VALUES = 100;

/** The file a collection run writes and the local website reads. */
export const LOCAL_DATABASE = "local.db";

/**
 * A local SQLite database; ":memory:" gives a throwaway one for tests. The website opens it
 * read-only: it never writes, and a missing file is an error and not a new empty database.
 */
export function openSqlite(path: string, { readOnly = false } = {}): Db {
  const db = new DatabaseSync(path, { readOnly });
  return {
    async exec(sql) {
      db.exec(sql);
    },
    async run(sql, ...params) {
      db.prepare(sql).run(...params);
    },
    async all<T>(sql: string, ...params: SqlValue[]) {
      // Plain objects, so rows compare equal to object literals.
      return db.prepare(sql).all(...params).map((row) => ({ ...row })) as T[];
    },
  };
}

const schema = () => readFileSync(new URL("./schema.sql", import.meta.url), "utf8");

export async function applySchema(db: Db): Promise<void> {
  await db.exec(schema());
}

/** The names of the tables db/schema.sql creates, in its order. */
export function schemaTables(): string[] {
  return [...schema().matchAll(/^CREATE TABLE IF NOT EXISTS (\w+)/gm)].map((match) => match[1]!);
}
