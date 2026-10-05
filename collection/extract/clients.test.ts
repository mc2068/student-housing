import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { modelExtractor, withFallback } from "./extractor";
import { geminiExtractor } from "./gemini";
import { groqExtractor } from "./groq";

afterEach(() => vi.unstubAllGlobals());

// A real answer from Gemini, saved as returned, for two made-up posts: an offer and a demand.
const geminiSample = readFileSync(new URL("./gemini.sample.json", import.meta.url), "utf8");

const OFFER = { offer: true, kind: "rental", price: 800, neighbourhood: "le-bardo", size: 1, furnished: null, gender: "unspecified" };

describe("gemini client", () => {
  it("reads a real saved answer", async () => {
    vi.stubGlobal("fetch", async () => new Response(geminiSample));

    const results = await geminiExtractor("key", "any-model").extract(["first post", "second post"]);

    expect(results).toEqual([
      {
        offer: true,
        facts: { kind: "flatshare", price: 350, neighbourhoodId: "el-manar", size: 2, furnished: true, genderRestriction: "girls" },
      },
      { offer: false, reason: "demand" },
    ]);
  });

  it("hands the batch to the next model when its quota is spent", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      return url.includes("big-model")
        ? new Response(JSON.stringify({ error: { code: 429, message: "quota" } }), { status: 429 })
        : new Response(geminiSample);
    });

    const extractor = withFallback([geminiExtractor("key", "big-model"), geminiExtractor("key", "small-model")]);

    expect(await extractor.extract(["first post", "second post"])).toHaveLength(2);
    expect(calls).toHaveLength(2);
  });
});

describe("groq client", () => {
  // No Groq key was available to save a real answer; this is the documented OpenAI-compatible shape.
  it("reads an answer in the chat-completions shape", async () => {
    const body = { choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify({ results: [{ i: 0, ...OFFER }] }) }, finish_reason: "stop" }] };
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify(body)));

    expect(await groqExtractor("key").extract(["S+1 bardo"])).toMatchObject([{ offer: true, facts: { neighbourhoodId: "le-bardo" } }]);
  });
});

describe("model extractor", () => {
  it("masks phone numbers in the prompt, whatever the caller passed", async () => {
    let prompt = "";
    const extractor = modelExtractor("fake", async (p) => {
      prompt = p;
      return JSON.stringify({ results: [{ i: 0, ...OFFER }] });
    });

    await extractor.extract(["S+1 bardo appeler 22 333 444"]);

    expect(prompt).toContain("S+1 bardo appeler [numéro masqué]");
    expect(prompt).not.toContain("22 333 444");
  });
});
