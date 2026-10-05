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

/** A local SQLite database; ":memory:" gives a throwaway one for tests. */
export function openSqlite(path: string): Db {
  const db = new DatabaseSync(path);
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

export async function applySchema(db: Db): Promise<void> {
  await db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
}
