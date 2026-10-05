import type { Extractor } from "../domain";
import { GEMINI_MODELS, geminiExtractor } from "./gemini";
import { groqExtractor } from "./groq";

/**
 * The models that read posts, in the order they are tried, from the keys in the environment.
 * A collection run and the evaluation share it, so the evaluation measures what collection uses.
 */
export function configuredExtractors(env: NodeJS.ProcessEnv = process.env): Extractor[] {
  const geminiKey = env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("Missing GEMINI_API_KEY");
  const extractors = GEMINI_MODELS.map((model) => geminiExtractor(geminiKey, model));
  if (env.GROQ_API_KEY) extractors.push(groqExtractor(env.GROQ_API_KEY));
  return extractors;
}
