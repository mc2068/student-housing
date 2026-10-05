import type { Extractor } from "../domain";
import { GEMINI_LITE_MODELS, GEMINI_MODELS, geminiExtractor } from "./gemini";
import { groqExtractor } from "./groq";

function geminiKey(env: NodeJS.ProcessEnv): string {
  if (!env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
  return env.GEMINI_API_KEY;
}

/** The models that read posts, in the order they are tried, from the keys in the environment. */
export function configuredExtractors(env: NodeJS.ProcessEnv = process.env): Extractor[] {
  return GEMINI_MODELS.map((model) => geminiExtractor(geminiKey(env), model));
}

/**
 * The models that get more facts wrong, in the order they are tried. A collection run hands them only a
 * batch the models above have failed twice (collection/collect.ts); the evaluation tries them after the
 * others, and names the model that read each post, so it measures both.
 */
export function lastResortExtractors(env: NodeJS.ProcessEnv = process.env): Extractor[] {
  const extractors = GEMINI_LITE_MODELS.map((model) => geminiExtractor(geminiKey(env), model));
  // Never measured: no key was available.
  if (env.GROQ_API_KEY) extractors.push(groqExtractor(env.GROQ_API_KEY));
  return extractors;
}
