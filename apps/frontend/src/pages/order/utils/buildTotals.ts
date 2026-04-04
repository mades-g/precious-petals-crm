import type { LineItem, OrderExtrasDraft, Totals } from "../types";

const getExtrasTotal = (extras?: OrderExtrasDraft | null) => {
  if (!extras) return 0;
  const values = [
    extras.replacementFlowers ? extras.replacementFlowersPrice : null,
    extras.collectionQty != null && extras.collectionQty > 0
      ? extras.collectionPrice
      : null,
    extras.deliveryQty != null && extras.deliveryQty > 0
      ? extras.deliveryPrice
      : null,
    extras.recreateButtonholeQty != null && extras.recreateButtonholeQty > 0
      ? extras.recreateButtonholePrice
      : null,
    extras.returnUnusedFlowers ? extras.returnUnusedFlowersPrice : null,
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
  const grandTotal =
    lineItems.reduce((sum, item) => sum + item.total, 0) +
    (getExtrasTotal(extras) || 0);
  const vatRate = 0.2;
  const vatTotal = grandTotal - grandTotal / (1 + vatRate);
  const subTotal = grandTotal - vatTotal;

  return { subTotal, vatRate, vatTotal, grandTotal };
};
