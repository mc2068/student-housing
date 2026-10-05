// The French wording of a listing's facts, in one place.
import { facebookGroups, neighbourhoods } from "../collection/data";
import type { GenderRestriction, Kind } from "../collection/domain";
import { LARGEST_SIZE_CHOICE } from "../search/search";

export const KIND_LABEL: Record<Kind, string> = { rental: "Location", flatshare: "Colocation" };

// The price basis follows the kind.
export const PRICE_BASIS_LABEL: Record<Kind, string> = { rental: "logement entier", flatshare: "par personne" };

/** A fact as a card shows it; `stated` is false when the post did not say. */
export interface FactLabel {
  text: string;
  stated: boolean;
}

const sizeName = (size: number) => (size === 0 ? "Studio" : `S+${size}`);

export function sizeLabel(size: number | null): FactLabel {
  if (size === null) return { text: "Taille non précisée", stated: false };
  return { text: sizeName(size), stated: true };
}

/** A size as the search form offers it; the largest choice also covers every larger unit. */
export function sizeChoiceLabel(size: number): string {
  return size === LARGEST_SIZE_CHOICE ? `${sizeName(size)} et +` : sizeName(size);
}

export const furnishedName = (furnished: boolean) => (furnished ? "Meublé" : "Non meublé");

export function furnishedLabel(furnished: boolean | null): FactLabel {
  if (furnished === null) return { text: "Meublé ou non : non précisé", stated: false };
  return { text: furnishedName(furnished), stated: true };
}

/** An amount in dinars as the site writes it: "1 300 DT". */
export const dinars = (amount: number) => `${amount.toLocaleString("fr-FR")} DT`;

export function genderRestrictionLabel(genderRestriction: GenderRestriction): FactLabel {
  if (genderRestriction === "unspecified") return { text: "Filles ou garçons : non précisé", stated: false };
  return { text: genderRestriction === "girls" ? "Filles uniquement" : "Garçons uniquement", stated: true };
}

export function neighbourhoodName(id: string): string {
  return neighbourhoods.find((neighbourhood) => neighbourhood.id === id)?.name ?? id;
}

/** Where a listing's link leads: the site, and the group when the source is a Facebook group. */
export function sourceLabel(sourceId: string): { site: string; group?: string } {
  const group = facebookGroups.find((g) => g.id === sourceId);
  return group ? { site: "Facebook", group: group.name } : { site: sourceId };
}

const RELATIVE_TIME = new Intl.RelativeTimeFormat("fr", { numeric: "always" });

/** How long ago a listing was posted, in whole minutes, hours or days: "il y a 3 heures". */
export function age(postedAt: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - new Date(postedAt).getTime()) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return RELATIVE_TIME.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return RELATIVE_TIME.format(-hours, "hour");
  return RELATIVE_TIME.format(-Math.floor(hours / 24), "day");
}
