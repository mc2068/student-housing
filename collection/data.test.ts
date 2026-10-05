import { describe, expect, it } from "vitest";
import { facebookGroups, faculties, neighbourhoods } from "./data";

describe("curated data", () => {
  const unique = (ids: string[]) => new Set(ids).size === ids.length;

  it("has unique neighbourhood, faculty and group ids", () => {
    expect(unique(neighbourhoods.map((n) => n.id))).toBe(true);
    expect(unique(faculties.map((f) => f.id))).toBe(true);
    expect(unique(facebookGroups.map((g) => g.id))).toBe(true);
  });

  it("only maps faculties to known neighbourhoods", () => {
    const known = new Set(neighbourhoods.map((n) => n.id));
    for (const f of faculties) {
      expect(f.neighbourhoods.length, f.id).toBeGreaterThan(0);
      expect(f.neighbourhoods.filter((n) => !known.has(n)), f.id).toEqual([]);
    }
  });
});
