import { setTimeout as sleep } from "node:timers/promises";

// The longest one request may take, set far above an answer for ten posts. Past it the request fails and
// the fallback model takes over, so a connection left hanging cannot hold the run.
const REQUEST_LIMIT_MS = 2 * 60_000;

/**
 * Free tiers answer 503 (overloaded) often: retry briefly. A 429 is a spent quota (20 requests a day
 * per model on Gemini's larger Flash models), which no short wait fixes, so it is returned at once
 * and the fallback model takes over.
 */
export async function sendWithRetry(url: string, init: RequestInit): Promise<Response> {
  const send = () => fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_LIMIT_MS) });
  for (const waitMs of [5000, 15000]) {
    const res = await send();
    if (res.status !== 503) return res;
    await sleep(waitMs);
  }
  return send();
}
