import { setTimeout as sleep } from "node:timers/promises";

/**
 * Free tiers answer 503 (overloaded) often: retry briefly. A 429 is a spent quota (20 requests a day
 * per model on Gemini's larger Flash models), which no short wait fixes, so it is returned at once
 * and the fallback model takes over.
 */
export async function sendWithRetry(url: string, init: RequestInit): Promise<Response> {
  for (const waitMs of [5000, 15000]) {
    const res = await fetch(url, init);
    if (res.status !== 503) return res;
    await sleep(waitMs);
  }
  return fetch(url, init);
}
