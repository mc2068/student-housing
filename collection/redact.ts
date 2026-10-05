export const MASK = "[numéro masqué]";

// ASCII, Arabic-Indic and Eastern Arabic-Indic digits: posts are written in all three.
const DIGIT = "0-9\\u0660-\\u0669\\u06F0-\\u06F9";
// A run of digit groups joined by up to three spaces, dots, dashes, slashes or brackets.
// A "+" counts as an international prefix unless it follows a letter, as in "S+2".
const RUN = new RegExp(`(?:(?<![A-Za-z])\\+)?[${DIGIT}]+(?:[\\s.\\-–—/()]{1,3}[${DIGIT}]+)*`, "g");
const GROUP = new RegExp(`[${DIGIT}]+`, "g");

// How an eight-digit Tunisian number is usually grouped: 22 333 444, 22 33 44 55, 22333444.
const PHONE_GROUPINGS = [[2, 3, 3], [2, 2, 2, 2], [8]];

const toAscii = (digits: string) =>
  digits.replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 0xf));

/**
 * Masks the phone number inside one run of digits, keeping a price that sits next to it
 * ("400 22 333 444" keeps 400). When the run cannot be told apart, all of it is masked:
 * losing a price is better than keeping a number (docs/adr/0002).
 */
function maskRun(run: string): string {
  const groups = [...run.matchAll(GROUP)];
  const digits = toAscii(groups.map((g) => g[0]).join(""));
  if (digits.length < 8) return run;

  const international = run.startsWith("+") || digits.startsWith("00");
  if ((international && digits.length >= 10) || (digits.startsWith("216") && digits.length === 11)) return MASK;

  const spans: [start: number, end: number][] = [];
  let maskedDigits = 0;
  for (let i = 0; i < groups.length; ) {
    const grouping = PHONE_GROUPINGS.find((sizes) => sizes.every((size, j) => groups[i + j]?.[0].length === size));
    if (!grouping) {
      i++;
      continue;
    }
    const last = groups[i + grouping.length - 1]!;
    spans.push([groups[i]!.index, last.index + last[0].length]);
    maskedDigits += 8;
    i += grouping.length;
  }
  if (spans.length === 0 || digits.length - maskedDigits >= 8) return MASK;

  let masked = run;
  for (const [start, end] of spans.reverse()) masked = masked.slice(0, start) + MASK + masked.slice(end);
  return masked;
}

export function stripPhoneNumbers(text: string): string {
  return text.replace(RUN, maskRun);
}

export function excerpt(text: string, max = 200): string {
  const clean = stripPhoneNumbers(text.replace(/\s+/g, " ").trim());
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}
