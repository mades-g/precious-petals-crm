import type { LineItem, OrderExtrasDraft, Totals } from "../types";

const getExtrasTotal = (extras?: OrderExtrasDraft | null) => {
  if (!extras) return 0;
  const values = [
    extras.replacementFlowersPrice,
    extras.collectionPrice,
    extras.deliveryPrice,
    extras.returnUnusedFlowersPrice,
  ];
  return values.reduce(
    (sum, value) => (sum || 0) + (typeof value === "number" ? value : 0),
    0,
  );
};

export const buildTotals = (
  lineItems: LineItem[],
  extras?: OrderExtrasDraft | null,
): Totals => {
  const subTotal =
    lineItems.reduce((sum, item) => sum + item.total, 0) +
    (getExtrasTotal(extras) || 0);
  const vatRate = 0.2;
  const vatTotal = subTotal * vatRate;
  const grandTotal = subTotal + vatTotal;

  return { subTotal, vatRate, vatTotal, grandTotal };
};
