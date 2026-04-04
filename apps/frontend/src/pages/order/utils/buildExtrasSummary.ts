import { formatCurrency } from "@/utils";
import type { FrameGlassDraft, OrderExtrasDraft } from "../types";

export const buildExtrasSummary = (
  orderExtras: OrderExtrasDraft,
  frameGlassDrafts: FrameGlassDraft[] = [],
): string[] => {
  const items: string[] = [];
  const formatPrice = (label: string, price?: number | null) => {
    const money =
      typeof price === "number" ? formatCurrency(price) : undefined;
    return money ? `${label} - ${money}` : label;
  };

  if (orderExtras.replacementFlowers) {
    items.push(
      formatPrice("Replacement flowers", orderExtras.replacementFlowersPrice),
    );
  }

  if (orderExtras.collectionQty != null && orderExtras.collectionQty > 0) {
    items.push(formatPrice("Collection", orderExtras.collectionPrice));
  }

  if (orderExtras.deliveryQty != null && orderExtras.deliveryQty > 0) {
    items.push(formatPrice("Delivery", orderExtras.deliveryPrice));
  }

  if (
    orderExtras.recreateButtonholeQty != null &&
    orderExtras.recreateButtonholeQty > 0
  ) {
    items.push(
      formatPrice("Recreate buttonhole", orderExtras.recreateButtonholePrice),
    );
  }

  frameGlassDrafts.forEach((draft) => {
    if (!draft.clearviewEnabled) return;
    const money = formatCurrency(draft.price ?? undefined);
    items.push(
      money
        ? `${draft.label} - Clearview UV glass - ${money}`
        : `${draft.label} - Clearview UV glass`,
    );
  });

  if (orderExtras.returnUnusedFlowers) {
    items.push(
      formatPrice(
        "Return unused flowers",
        orderExtras.returnUnusedFlowersPrice,
      ),
    );
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
