// The filters as the address carries them (`/?faculte=fst&type=colocation&budget_personne=400`), and their French wording.
import type { Kind } from "../collection/domain";
import { type Filters, SIZE_CHOICES } from "../search/search";
import { dinars, furnishedName, KIND_LABEL, PRICE_BASIS_LABEL, sizeChoiceLabel } from "./labels";

export type SearchParams = Record<string, string | string[] | undefined>;

/** The name each form field has in the address. */
export const PARAM = {
  faculty: "faculte",
  kind: "type",
  perPersonBudget: "budget_personne",
  wholeUnitBudget: "budget_logement",
  gender: "genre",
  sizes: "taille",
  furnished: "meuble",
} as const;

export const KIND_VALUE: Record<Kind, string> = { rental: "location", flatshare: "colocation" };
export const GENDER_VALUE: Record<NonNullable<Filters["gender"]>, string> = { girls: "filles", boys: "garcons" };
export const FURNISHED_VALUE = { yes: "oui", no: "non" } as const;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const keyOf = <K extends string>(values: Record<K, string>, value: string | undefined) =>
  (Object.keys(values) as K[]).find((key) => values[key] === value);

/** A budget in whole dinars; an empty or unusable field sets no limit. */
function budget(value: string | undefined): number | undefined {
  const amount = Math.floor(Number(value?.trim() || undefined));
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

/** The faculty the address names, as the id it has in the curated list. */
export const facultyIdFromParams = (params: SearchParams) => first(params[PARAM.faculty]);

/** Reads the filters from the address. A value the form could not have sent is left out. */
export function filtersFromParams(params: SearchParams): Filters {
  const furnished = keyOf(FURNISHED_VALUE, first(params[PARAM.furnished]));
  const sizes = [params[PARAM.sizes] ?? []].flat();
  return {
    kind: keyOf(KIND_VALUE, first(params[PARAM.kind])),
    perPersonBudget: budget(first(params[PARAM.perPersonBudget])),
    wholeUnitBudget: budget(first(params[PARAM.wholeUnitBudget])),
    gender: keyOf(GENDER_VALUE, first(params[PARAM.gender])),
    sizes: SIZE_CHOICES.filter((size) => sizes.includes(String(size))),
    furnished: furnished === undefined ? undefined : furnished === "yes",
  };
}

/** The filters in force, worded for the results page; empty when the search is by faculty alone. */
export function activeFilterLabels(filters: Filters): string[] {
  const labels: string[] = [];
  if (filters.kind) labels.push(`${KIND_LABEL[filters.kind]} uniquement`);
  // A budget for the kind the student left out limits nothing, so it is not announced.
  if (filters.perPersonBudget !== undefined && filters.kind !== "rental") {
    labels.push(`${KIND_LABEL.flatshare} : ${dinars(filters.perPersonBudget)} au plus, ${PRICE_BASIS_LABEL.flatshare}`);
  }
  if (filters.wholeUnitBudget !== undefined && filters.kind !== "flatshare") {
    labels.push(`${KIND_LABEL.rental} : ${dinars(filters.wholeUnitBudget)} au plus, ${PRICE_BASIS_LABEL.rental}`);
  }
  if (filters.gender) labels.push(filters.gender === "girls" ? "Ouvert aux filles" : "Ouvert aux garçons");
  if (filters.sizes?.length) labels.push(filters.sizes.map(sizeChoiceLabel).join(", "));
  if (filters.furnished !== undefined) labels.push(furnishedName(filters.furnished));
  return labels;
}
