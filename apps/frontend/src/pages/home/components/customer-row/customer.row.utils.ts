import { formatCurrency } from "@/utils";


const hasInchesAlready = (value: string) => /\binch(es)?\b/i.test(value);

export const ensureInchesSuffix = (value: string) =>
  hasInchesAlready(value) ? value : `${value} inches`;

export const normaliseDash = (value: string) =>
  value
    .trim()
    .replace(/\s*-\s*/g, " – ")
    .replace(/\s*–\s*/g, " – ");

export const titleCase = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const formatAddon = (
  label: string,
  detail?: string | null,
  price?: number | null,
) => {
  const safeDetail = detail?.trim();
  const withDetail = safeDetail ? `${label} – ${safeDetail}` : label;

  if (typeof price === "number" && price > 0) {
    return `${withDetail} (${formatCurrency(price)})`;
  }
  return withDetail;
};
