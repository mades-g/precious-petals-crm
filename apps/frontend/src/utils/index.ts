import type { CustomersHowRecommendedOptions } from "@/services/pb/types";

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
