// smsSegments.ts
// Accurate-ish GSM-7 vs UCS-2 detection + segment calculation.
//
// Notes:
// - SMS “GSM-7” uses a specific alphabet. Some chars require an "escape" (2 septets).
// - If ANY character is outside GSM-7, the whole message becomes UCS-2 (Unicode),
//   and limits become 70/67 instead of 160/153.
// - This logic matches how most SMS gateways split/charge segments.

export type SmsEncoding = "GSM-7" | "UCS-2";

export type SmsSegmentInfo = {
  encoding: SmsEncoding;
  length: number; // "effective" length (septets for GSM-7, chars for UCS-2)
  perSegment: number; // 160/153 or 70/67
  segments: number;
  remainingInSegment: number;
};

/**
 * GSM 03.38 basic character set (single-septet)
 * Includes: @£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ and common ASCII.
 *
 * We model this as a Set for quick lookup.
 */
const GSM_7_BASIC = new Set<string>([
  "@",
  "£",
  "$",
  "¥",
  "è",
  "é",
  "ù",
  "ì",
  "ò",
  "Ç",
  "\n",
  "Ø",
  "ø",
  "\r",
  "Å",
  "å",
  "Δ",
  "_",
  "Φ",
  "Γ",
  "Λ",
  "Ω",
  "Π",
  "Ψ",
  "Σ",
  "Θ",
  "Ξ",
  "Æ",
  "æ",
  "ß",
  "É",
  " ",
  "!",
  '"',
  "#",
  "¤",
  "%",
  "&",
  "'",
  "(",
  ")",
  "*",
  "+",
  ",",
  "-",
  ".",
  "/",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  ":",
  ";",
  "<",
  "=",
  ">",
  "?",
  "¡",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "Ä",
  "Ö",
  "Ñ",
  "Ü",
  "§",
  "¿",
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "ä",
  "ö",
  "ñ",
  "ü",
  "à",
]);

/**
 * GSM 03.38 extended table chars (escape + char) => counts as 2 septets.
 */
const GSM_7_EXTENDED = new Set<string>([
  "^",
  "{",
  "}",
  "\\",
  "[",
  "~",
  "]",
  "|",
  "€",
]);

/**
 * Returns:
 * - { encoding: "GSM-7", length: septetCount } if all chars are GSM-7 (basic or extended)
 * - { encoding: "UCS-2", length: codePointCount } otherwise
 */
export function measureSms(text: string): {
  encoding: SmsEncoding;
  length: number;
} {
  // Count Unicode code points properly (handles surrogate pairs/emoji)
  const codePoints = Array.from(text);

  let septets = 0;
  for (const ch of codePoints) {
    if (GSM_7_BASIC.has(ch)) {
      septets += 1;
      continue;
    }
    if (GSM_7_EXTENDED.has(ch)) {
      septets += 2; // escape + char
      continue;
    }
    // Non GSM-7 char => UCS-2
    return { encoding: "UCS-2", length: codePoints.length };
  }

  return { encoding: "GSM-7", length: septets };
}

/**
 * Calculate segments and remaining chars for the current (last) segment.
 */
export function smsSegmentInfo(text: string): SmsSegmentInfo {
  const { encoding, length } = measureSms(text);

  const singleLimit = encoding === "GSM-7" ? 160 : 70;
  const concatLimit = encoding === "GSM-7" ? 153 : 67;

  if (length === 0) {
    return {
      encoding,
      length: 0,
      perSegment: singleLimit,
      segments: 0,
      remainingInSegment: singleLimit,
    };
  }

  const segments = length <= singleLimit ? 1 : Math.ceil(length / concatLimit);
  const perSegment = segments === 1 ? singleLimit : concatLimit;

  // Remaining in the last segment
  const usedInLast =
    segments === 1 ? length : length - concatLimit * (segments - 1);
  const remainingInSegment = Math.max(perSegment - usedInLast, 0);

  return {
    encoding,
    length,
    perSegment,
    segments,
    remainingInSegment,
  };
}
