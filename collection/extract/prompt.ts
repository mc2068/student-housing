import type { Neighbourhood } from "../data";

export function buildPrompt(texts: string[], neighbourhoods: Neighbourhood[]): string {
  const places = neighbourhoods
    .map((n) => `- ${n.id}: ${[n.name, ...n.aliases].join(", ")}`)
    .join("\n");
  const posts = texts.map((t, i) => `### POST ${i}\n${t}`).join("\n\n");

  return `You read housing posts from Tunisia, written in French, Arabic, or Tunisian Arabic in Latin letters (often mixed, with typos). For each post, decide whether it OFFERS housing and extract the facts.

Rules:
- "offer" is false when the author is LOOKING for housing or a roommate to search with (reason "demand"), or the post is not about renting a home (reason "not_housing").
- "kind": "flatshare" when a room, bed or place in a shared home is offered (colocation, "place", "coloc"); "rental" when a whole unit is offered.
- "price": monthly price in Tunisian dinars as a number. For a flatshare it is the price per person; for a rental the price of the whole unit. "350dt", "350 د", "350 mille" all mean 350. null when no price is stated ("prix en privé").
- "neighbourhood": the id of the single best match from the list below, or null when the post names no place on the list. Never invent an id.
- "size": the n in "S+n" (studio = 0), or null.
- "furnished": true for meublé, false for non meublé / vide, null when not stated.
- "gender": "girls" (filles, بنات, étudiantes), "boys" (garçons, أولاد, étudiants only when clearly male-only), otherwise "unspecified".

Neighbourhoods:
${places}

Answer with JSON only, one result per post, in order:
{"results":[{"i":0,"offer":true,"reason":null,"kind":"flatshare","price":350,"neighbourhood":"el-manar","size":2,"furnished":true,"gender":"girls"}]}

${posts}`;
}
