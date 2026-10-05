import { readFileSync } from "node:fs";

export interface Neighbourhood {
  id: string;
  name: string;
  aliases: string[];
}

export interface Faculty {
  id: string;
  name: string;
  short: string;
  campus: string;
  neighbourhoods: string[];
}

export interface FacebookGroup {
  id: string;
  name: string;
  url: string;
}

function load<T>(file: string): T {
  return JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url), "utf8")) as T;
}

export const neighbourhoods = load<{ neighbourhoods: Neighbourhood[] }>("neighbourhoods.json").neighbourhoods;
export const faculties = load<{ faculties: Faculty[] }>("faculties.json").faculties;
export const facebookGroups = load<{ facebookGroups: FacebookGroup[] }>("sources.json").facebookGroups;
