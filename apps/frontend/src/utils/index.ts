import type {
  CustomersHowRecommendedOptions,
  OrdersOrderStatusOptions,
  OrdersPaymentStatusOptions,
} from "@/services/pb/types";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const formatCurrency = (
  value?: number | null,
  currency: "GBP" | "EUR" = "GBP",
  locale = "en-GB",
) => {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    value,
  );
};

export const parseDateOnly = (value: string) => {
  const match = DATE_ONLY_PATTERN.exec(value.trim());
  if (!match) return undefined;

  const [, year, month, day] = match;
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    12,
  );

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    return undefined;
  }

  return parsed;
};

export const toDateOnlyValue = (date: Date) => {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const todayDateOnly = (date = new Date()) => toDateOnlyValue(date);

export const formatDate = (date: string | Date) => {
  const parsed =
    date instanceof Date ? date : parseDateOnly(date) ?? new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return typeof date === "string" ? date : "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
};

export const formatDateTime = (date: string | Date) => {
  const parsed =
    date instanceof Date ? date : parseDateOnly(date) ?? new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return typeof date === "string" ? date : "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  }).format(parsed);
};

export const formatSnakeCase = (s: string | undefined) => {
  if (!s) return "";
  const sReplaced = s.replaceAll("_", " ");

  return `${sReplaced.charAt(0).toUpperCase()}${sReplaced.substring(1)}`;
};

export const howRecommendedColour = (
  howRecommended: CustomersHowRecommendedOptions,
) => {
  switch (howRecommended) {
    case "Florist":
      return "iris";
    case "Friend / Family":
      return "indigo";
    case "Previous customer":
      return "grass";
    case "Google":
      return "blue";
    default:
      return "cyan";
  }
};

export const formatAddressLines = (opts: {
  line1?: string | null;
  line2?: string | null;
  town?: string | null;
  county?: string | null;
  postcode?: string | null;
}): string[] => {
  const { line1, line2, town, county, postcode } = opts;

  const firstLineParts = [line1, line2].filter((v) => v && v.trim().length > 0);
  const secondLineParts = [town, county].filter(
    (v) => v && v.trim().length > 0,
  );

  const lines: string[] = [];
  if (firstLineParts.length) lines.push(firstLineParts.join(", "));
  if (secondLineParts.length) lines.push(secondLineParts.join(", "));
  if (postcode && postcode.trim().length > 0) lines.push(postcode);

  return lines;
};

export const ORDER_STATUS_COLOR_MAP: Record<
  OrdersOrderStatusOptions,
  "gray" | "green" | "yellow" | "red" | "blue" | "orange" | "cyan"
> = {
  draft: "gray",
  in_progress: "blue",
  to_choose: "orange",
  chosen: "cyan",
  ready: "yellow",
  left_the_studio: "green",
  cancelled: "red",
};

export const PAYMENT_STATUS_COLOR_MAP: Record<
  OrdersPaymentStatusOptions,
  "gray" | "orange" | "green" | "red" | "yellow"
> = {
  waiting_first_deposit: "gray",
  waiting_second_deposit: "orange",
  waiting_final_balance: "orange",

  first_deposit_paid: "yellow",
  second_deposit_paid: "yellow",

  final_balance_paid: "green",
};

export const getOrderStatusColor = (
  status?: OrdersOrderStatusOptions | null,
) => {
  if (!status) return "gray";
  return ORDER_STATUS_COLOR_MAP[status];
};

export const getPaymentStatusColor = (
  status?: OrdersPaymentStatusOptions | null,
) => {
  if (!status) return "gray";
  return PAYMENT_STATUS_COLOR_MAP[status];
};
