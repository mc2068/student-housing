// Imported, not read from disk, so the website can bundle the same curated files the collection run uses.
import facultiesFile from "../data/faculties.json";
import neighbourhoodsFile from "../data/neighbourhoods.json";
import sourcesFile from "../data/sources.json";

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

export const neighbourhoods: Neighbourhood[] = neighbourhoodsFile.neighbourhoods;
export const faculties: Faculty[] = facultiesFile.faculties;
export const facebookGroups: FacebookGroup[] = sourcesFile.facebookGroups;
