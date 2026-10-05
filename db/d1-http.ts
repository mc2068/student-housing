import { setTimeout as sleep } from "node:timers/promises";
import type { Db, SqlValue } from "./db";

export interface D1Account {
  accountId: string;
  databaseId: string;
  /** A Cloudflare API token allowed to edit D1 and nothing else (docs/daily-collection.md). */
  apiToken: string;
  /** How long to wait before asking again when Cloudflare's servers fail. */
  retryWaitsMs?: number[];
}

// The answer of D1's query endpoint, as far as this reads it: one entry of `result` per statement.
interface D1Answer<T> {
  success?: boolean;
  errors?: { code?: number; message?: string }[];
  result?: { results?: T[] }[];
}

type Attempt<T> = { rows: T[] } | { failure: string; askAgain: boolean };

/**
 * The hosted database, reached from outside Cloudflare through D1's HTTP API: this is how the daily
 * collection run on GitHub writes to it (docs/adr/0003). A Worker's binding (db/d1.ts) does not exist there.
 * One request per statement; Cloudflare allows 1,200 requests in 5 minutes and a run makes well under 100.
 * It imports no database of its own, so it loads wherever `fetch` exists.
 */
export function openD1OverHttp({ accountId, databaseId, apiToken, retryWaitsMs = [2000, 10000] }: D1Account): Db {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  async function attempt<T>(body: string): Promise<Attempt<T>> {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiToken}` },
        body,
      });
    } catch (err) {
      return { failure: `Cloudflare D1 could not be reached: ${err instanceof Error ? err.message : String(err)}`, askAgain: true };
    }
    const answer = (await res.json().catch(() => undefined)) as D1Answer<T> | undefined;
    if (res.ok && answer?.success) return { rows: answer.result?.[0]?.results ?? [] };
    // Cloudflare's wording goes on as it is: a spent daily limit or a missing table is said there.
    const reasons = (answer?.errors ?? []).map((e) => `${e.message ?? "no message"} (code ${e.code ?? "?"})`).join("; ");
    // A refusal (a wrong key, a spent limit, a wrong statement) is an answer; only a failure to answer is worth repeating.
    return { failure: `Cloudflare D1 answered ${res.status}: ${reasons || "no reason given"}`, askAgain: res.status >= 500 };
  }

  // Every statement the project sends can be sent twice with the same result (an INSERT writes over its
  // own row, the schema creates only what is missing), so a request that got no answer is simply repeated.
  async function query<T>(sql: string, params?: SqlValue[]): Promise<T[]> {
    const body = JSON.stringify(params ? { sql, params } : { sql });
    for (let tries = 0; ; tries++) {
      const result = await attempt<T>(body);
      if ("rows" in result) return result.rows;
      const waitMs = retryWaitsMs[tries];
      if (!result.askAgain || waitMs === undefined) throw new Error(result.failure);
      await sleep(waitMs);
    }
  }

  return {
    // The endpoint takes several statements joined by semicolons when no values are bound.
    async exec(sql) {
      await query(sql);
    },
    async run(sql, ...params) {
      await query(sql, params);
    },
    all: <T>(sql: string, ...params: SqlValue[]) => query<T>(sql, params),
  };
}
