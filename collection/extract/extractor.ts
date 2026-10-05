import { neighbourhoods } from "../data";
import { type Extraction, type Extractor, isUnreadable } from "../domain";
import { stripPhoneNumbers } from "../redact";
import { parseResults } from "./parse";
import { buildPrompt } from "./prompt";

const knownIds = new Set(neighbourhoods.map((n) => n.id));

/** An extractor backed by any model that takes a prompt and returns JSON text. */
export function modelExtractor(name: string, complete: (prompt: string) => Promise<string>): Extractor {
  return {
    name,
    async extract(texts) {
      // The last gate before a third party: phone numbers never leave the machine (docs/adr/0002).
      const answer = await complete(buildPrompt(texts.map(stripPhoneNumbers), neighbourhoods));
      const results = parseResults(answer, texts.length, knownIds);
      // An answer with nothing usable is a failed call, so the fallback model gets the batch.
      if (results.every(isUnreadable)) throw new Error(`${name} gave an unusable answer (${answer.length} chars)`);
      return results;
    },
  };
}

/** Tries each extractor in turn; the next one is used only when the previous throws (quota, outage). */
export function withFallback(extractors: Extractor[]): Extractor {
  return {
    name: extractors.map((e) => e.name).join(" → "),
    async extract(texts): Promise<Extraction[]> {
      let lastError: unknown;
      for (const extractor of extractors) {
        try {
          return await extractor.extract(texts);
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError ?? new Error("No extractor configured");
    },
  };
}
