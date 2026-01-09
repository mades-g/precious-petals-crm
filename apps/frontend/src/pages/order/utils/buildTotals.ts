import type { LineItem, Totals } from "../types";

export const buildTotals = (lineItems: LineItem[]): Totals => {
  const subTotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const vatRate = 0.2;
  const vatTotal = subTotal * vatRate;
  const grandTotal = subTotal + vatTotal;

  return { subTotal, vatRate, vatTotal, grandTotal };
};
