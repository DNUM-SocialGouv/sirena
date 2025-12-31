export function extractPostalCode(raw?: string | null): string | null {
  if (!raw) return null;

  const match = raw.match(/(?<!\d)\d{5}(?!\d)/);
  return match ? match[0] : null;
}

function luhnCheck(num: string): boolean {
  // Standard Luhn algorithm
  let sum = 0;
  let doubleDigit = false;

  for (let i = num.length - 1; i >= 0; i--) {
    let d = num.charCodeAt(i) - 48; // '0' = 48
    if (doubleDigit) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

/**
 * Extract a FINESS number from free text.
 * FINESS structure (9 digits): DD 0 OOOOO C
 *  - D1–D2: department (2 digits; e.g. “20” for Corsica)
 *  - D3:    always '0'
 *  - D4–D8: order number (5 digits)
 *  - D9:    Luhn check digit
 */
export function extractFinessFromRawText(raw?: string | null): string | null {
  if (!raw) return null;

  // Normalize non-breaking spaces (optional but safer for regex)
  const s = raw.replace(/\u00A0/g, ' ');

  // 1) Find standalone 9-digit sequences (not touching other digits)
  const nineDigitMatches = Array.from(s.matchAll(/(?<!\d)(\d{9})(?!\d)/g)).map((m) => m[1]);
  if (nineDigitMatches.length === 0) return null;

  // 2) FINESS structural constraint: 3rd digit must be '0'
  const structural = nineDigitMatches.filter((x) => x[2] === '0');

  // 3) Prefer those that pass the Luhn check
  const luhnValid = structural.filter(luhnCheck);
  if (luhnValid.length > 0) return luhnValid[0];

  // 4) If none pass Luhn but exactly one meets the structural rule, use it
  if (structural.length === 1) return structural[0];

  // 5) Final fallback: if there is only one 9-digit sequence, return it
  if (nineDigitMatches.length === 1) return nineDigitMatches[0];

  return null;
}
