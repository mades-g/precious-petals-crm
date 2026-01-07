import { formatCurrency } from "@/utils";

type ExtrasRecord = Record<string, unknown>;

export const toExtrasRecord = (extras: unknown): ExtrasRecord =>
  extras && typeof extras === "object" ? (extras as ExtrasRecord) : {};

export const getNumber = (obj: ExtrasRecord, key: string): number | null => {
  const v = obj[key];
  return typeof v === "number" ? v : null;
};

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
