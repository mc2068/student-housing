import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openD1OverHttp } from "./d1-http";

afterEach(() => vi.unstubAllGlobals());

// No Cloudflare account was available to save a real answer. This is the answer of D1's query endpoint as
// its reference documents it (developers.cloudflare.com/api/resources/d1/subresources/database/methods/query),
// with made-up rows.
const sample = readFileSync(new URL("./d1-http.sample.json", import.meta.url), "utf8");

// What the same endpoint answers when a statement is refused: no rows, and the reason in `errors`.
const refusal = JSON.stringify({ errors: [{ code: 7500, message: "no such table: listings: SQLITE_ERROR" }], messages: [], result: [], success: false });

const ACCOUNT = { accountId: "account-1", databaseId: "database-1", apiToken: "secret-token", retryWaitsMs: [0, 0] };

/** Answers each request with the next of these, and keeps what was asked. */
function cloudflare(...answers: (() => Response)[]) {
  const requests: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    requests.push({ url, init });
    return (answers[requests.length - 1] ?? answers.at(-1)!)();
  });
  return requests;
}

const body = (request: { init: RequestInit }) => JSON.parse(String(request.init.body)) as unknown;

describe("the D1 database over Cloudflare's HTTP API", () => {
  it("reads the rows of an answer in the documented shape", async () => {
    cloudflare(() => new Response(sample));

    const rows = await openD1OverHttp(ACCOUNT).all("SELECT url, price, size FROM listings");

    expect(rows).toEqual([
      { url: "https://www.facebook.com/groups/1/permalink/1/", price: 350, size: null },
      { url: "https://www.facebook.com/groups/1/permalink/2/", price: null, size: 2 },
    ]);
  });

  it("asks for one statement with its values, numbers and missing values kept as they are", async () => {
    const requests = cloudflare(() => new Response(sample));

    await openD1OverHttp(ACCOUNT).run("INSERT INTO listings (url, price, size) VALUES (?, ?, ?)", "https://example.org/1", 350, null);

    expect(requests).toHaveLength(1);
    expect(requests[0]!.url).toBe("https://api.cloudflare.com/client/v4/accounts/account-1/d1/database/database-1/query");
    expect(requests[0]!.init.method).toBe("POST");
    expect(requests[0]!.init.headers).toMatchObject({ authorization: "Bearer secret-token", "content-type": "application/json" });
    expect(body(requests[0]!)).toEqual({
      sql: "INSERT INTO listings (url, price, size) VALUES (?, ?, ?)",
      params: ["https://example.org/1", 350, null],
    });
  });

  it("sends several statements at once without values", async () => {
    const requests = cloudflare(() => new Response(sample));

    await openD1OverHttp(ACCOUNT).exec("CREATE TABLE IF NOT EXISTS a (x);\nCREATE TABLE IF NOT EXISTS b (y);");

    expect(body(requests[0]!)).toEqual({ sql: "CREATE TABLE IF NOT EXISTS a (x);\nCREATE TABLE IF NOT EXISTS b (y);" });
  });

  it("fails with Cloudflare's own words when a statement is refused, and never with the key", async () => {
    const requests = cloudflare(() => new Response(refusal, { status: 400 }));

    const failure = await openD1OverHttp(ACCOUNT).all("SELECT url FROM listings").catch((err: Error) => err);

    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain("400");
    expect((failure as Error).message).toContain("no such table: listings");
    expect((failure as Error).message).not.toContain("secret-token");
    // A refusal is an answer: asking again would not change it.
    expect(requests).toHaveLength(1);
  });

  it("fails on an answer that says it did not succeed, whatever its status", async () => {
    cloudflare(() => new Response(refusal));

    await expect(openD1OverHttp(ACCOUNT).run("DELETE FROM listings")).rejects.toThrow("no such table: listings");
  });

  it("asks again when Cloudflare's servers fail, and carries on once they answer", async () => {
    const requests = cloudflare(
      () => new Response("<html>502 Bad Gateway</html>", { status: 502 }),
      () => {
        throw new TypeError("fetch failed");
      },
      () => new Response(sample),
    );

    expect(await openD1OverHttp(ACCOUNT).all("SELECT url FROM listings")).toHaveLength(2);
    expect(requests).toHaveLength(3);
  });

  it("gives up when Cloudflare's servers keep failing, and says with which status", async () => {
    const requests = cloudflare(() => new Response("<html>502 Bad Gateway</html>", { status: 502 }));

    await expect(openD1OverHttp(ACCOUNT).all("SELECT url FROM listings")).rejects.toThrow("502");
    expect(requests).toHaveLength(3);
  });
});
