import type { Extractor } from "../domain";
import { modelExtractor } from "./extractor";
import { sendWithRetry } from "./http";

const GROQ_MODEL = "llama-3.3-70b-versatile";

interface GroqAnswer {
  choices?: { message?: { content?: string } }[];
}

/** Optional last fallback, used only when a Groq key is configured. */
export function groqExtractor(apiKey: string): Extractor {
  return modelExtractor(`groq:${GROQ_MODEL}`, async (prompt) => {
    const res = await sendWithRetry("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
    return ((await res.json()) as GroqAnswer).choices?.[0]?.message?.content ?? "";
  });
}
