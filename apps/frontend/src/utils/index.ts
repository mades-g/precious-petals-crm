import type {
  CustomersHowRecommendedOptions,
  OrdersOrderStatusOptions,
  OrdersPaymentStatusOptions,
} from "@/services/pb/types";

export const formatDate = (date: string) => {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "short",
  }).format(new Date(date));
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

/* -----------------------------------------------
 * ORDER STATUS → RADIX COLOR MAPPING
 * --------------------------------------------- */

export const ORDER_STATUS_COLOR_MAP: Record<
  OrdersOrderStatusOptions,
  "gray" | "green" | "yellow" | "red" | "blue"
> = {
  draft: "gray",
  in_progress: "blue",
  ready: "yellow",
  delivered: "green",
  cancelled: "red",
};

/* -----------------------------------------------
 * PAYMENT STATUS → RADIX COLOR MAPPING
 * --------------------------------------------- */

export const PAYMENT_STATUS_COLOR_MAP: Record<
  OrdersPaymentStatusOptions,
  "gray" | "orange" | "green" | "red" | "yellow"
> = {
  wainting_first_deposit: "orange",
  waiting_second_deposit: "orange",
  waiting_final_balance: "orange",

  first_deposit_paid: "yellow",
  second_deposit_paid: "yellow",

  final_balance_paid: "green",
};

/* -----------------------------------------------
 * Utility getters
 * --------------------------------------------- */

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
