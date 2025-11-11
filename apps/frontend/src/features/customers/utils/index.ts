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
