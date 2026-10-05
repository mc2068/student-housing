import { describe, expect, it } from "vitest";
import { excerpt, MASK, stripPhoneNumbers } from "./redact";

describe("stripPhoneNumbers", () => {
  it.each([
    "22333444",
    "22 333 444",
    "22.333.444",
    "98-765-432",
    "22 33 34 44",
    "22  333  444",
    "22 - 333 - 444",
    "22/333/444",
    "22 333444",
    "2233 3444",
    "٢٢٣٣٣٤٤٤",
    "٢٢ ٣٣٣ ٤٤٤",
    "۲۲۳۳۳۴۴۴",
    "+216 22 333 444",
    "+21622333444",
    "(+216) 22 333 444",
    "0021622333444",
    "00216 22 333 444",
    "216 22 333 444",
    "+33612345678",
    "+33 6 12 34 56 78",
  ])("masks %s", (phone) => {
    const masked = stripPhoneNumbers(`appeler ${phone} svp`);
    expect(masked).toContain(MASK);
    expect(masked.replace(MASK, "")).not.toMatch(/[0-9٠-٩۰-۹]/);
  });

  it("masks two numbers written side by side", () => {
    expect(stripPhoneNumbers("22 333 444 / 98 765 432")).toBe(`${MASK} / ${MASK}`);
  });

  it.each([
    ["prix 400 22333444", `prix 400 ${MASK}`],
    ["prix 400 22 333 444", `prix 400 ${MASK}`],
    ["Loyer 450\n98 765 432", `Loyer 450\n${MASK}`],
    ["22 333 444 350dt", `${MASK} 350dt`],
    ["Manar 2 22 333 444", `Manar 2 ${MASK}`],
    ["S+2 22 333 444", `S+2 ${MASK}`],
    ["S+1 98765432", `S+1 ${MASK}`],
  ])("keeps the price or size next to a number: %s", (text, expected) => {
    expect(stripPhoneNumbers(text)).toBe(expected);
  });

  it.each([
    "coloc pour fille manar 2, S+2, 350dt, caution 700",
    "loyer 1 200 DT, 120 m², 3ème étage",
    "S+3 à 1300/mois, caution 2600",
    "350 ou 400 dt",
  ])("leaves a text without a phone number alone: %s", (text) => {
    expect(stripPhoneNumbers(text)).toBe(text);
  });
});

describe("excerpt", () => {
  it("masks phones, collapses whitespace and truncates", () => {
    const out = excerpt(`studio\n\nmeublé  tel 22  333  444 ${"x".repeat(300)}`, 50);
    expect(out).toBe(`studio meublé tel ${MASK} ${"x".repeat(15)}…`);
  });
});
