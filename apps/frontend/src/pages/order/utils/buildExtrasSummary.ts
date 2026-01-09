import { formatCurrency } from "@/utils";
import type { OrderExtrasDraft } from "../types";

export const buildExtrasSummary = (orderExtras: OrderExtrasDraft): string[] => {
  const items: string[] = [];
  const formatQtyPrice = (
    label: string,
    qty?: number | null,
    price?: number | null,
  ) => {
    if (!qty || !price || price === 0 || qty === 0) return null;
    const parts = [label];
    if (qty != null && qty > 0) parts.push(`Qty ${qty}`);
    const money = formatCurrency(price);
    if (money) parts.push(money);
    return parts.join(" - ");
  };

  if (
    orderExtras.replacementFlowers ||
    (orderExtras.replacementFlowersQty &&
      orderExtras.replacementFlowersQty > 0) ||
    (orderExtras.replacementFlowersPrice &&
      orderExtras.replacementFlowersPrice > 0)
  ) {
    items.push(
      formatQtyPrice(
        "Replacement flowers",
        orderExtras.replacementFlowersQty,
        orderExtras.replacementFlowersPrice,
      ) || "Replacement flowers",
    );
  }

  const collection = formatQtyPrice(
    "Collection",
    orderExtras.collectionQty,
    orderExtras.collectionPrice,
  );
  if (collection) items.push(collection);

  const delivery = formatQtyPrice(
    "Delivery",
    orderExtras.deliveryQty,
    orderExtras.deliveryPrice,
  );
  if (delivery) items.push(delivery);

  if (
    orderExtras.returnUnusedFlowers ||
    (orderExtras.returnUnusedFlowersPrice &&
      orderExtras.returnUnusedFlowersPrice > 0)
  ) {
    const money =
      orderExtras.returnUnusedFlowersPrice != null
        ? formatCurrency(orderExtras.returnUnusedFlowersPrice)
        : undefined;
    const returnUnused = money
      ? `Return unused flowers - ${money}`
      : "Return unused flowers";
    items.push(returnUnused);
  }

  if (orderExtras.artistHours && orderExtras.artistHours > 0) {
    items.push(`Artist hours - ${orderExtras.artistHours}`);
  }

  const trimmedNotes = orderExtras.notes.trim();
  if (trimmedNotes.length > 0) {
    const shortNote =
      trimmedNotes.length > 36
        ? `${trimmedNotes.slice(0, 36)}...`
        : trimmedNotes;
    items.push(`Notes - ${shortNote}`);
  }

  return items;
};
