import type { Extractor } from "../domain";
import { modelExtractor } from "./extractor";
import { sendWithRetry } from "./http";

// Tried in order. A single free-tier model is overloaded or out of quota too often to rely on.
export const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

interface GeminiAnswer {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

const answerText = (body: GeminiAnswer) => (body.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");

export function geminiExtractor(apiKey: string, model: string): Extractor {
  return modelExtractor(`gemini:${model}`, async (prompt) => {
    const res = await sendWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    return answerText((await res.json()) as GeminiAnswer);
  });
}
