import type { Db, SqlValue } from "./db";

/** The part of a Cloudflare D1 binding this uses. */
export interface D1Binding {
  prepare(sql: string): D1Statement;
}

interface D1Statement {
  bind(...params: SqlValue[]): D1Statement;
  run(): Promise<unknown>;
  all<T>(): Promise<{ results: T[] }>;
}

/**
 * The hosted database, reached through a Worker's binding: this is how the deployed website reads it.
 * It imports nothing from Node, so it can be loaded on Cloudflare.
 */
export function openD1(d1: D1Binding): Db {
  return {
    // D1's own exec takes one statement per line and the schema spreads each over several; a prepared
    // statement takes them as they are. The website never calls this: the hosted schema is applied by
    // `npm run hosted:schema`. It is checked on the local D1 only.
    async exec(sql) {
      await d1.prepare(sql).run();
    },
    async run(sql, ...params) {
      await d1.prepare(sql).bind(...params).run();
    },
    async all<T>(sql: string, ...params: SqlValue[]) {
      return (await d1.prepare(sql).bind(...params).all<T>()).results;
    },
  };
}
