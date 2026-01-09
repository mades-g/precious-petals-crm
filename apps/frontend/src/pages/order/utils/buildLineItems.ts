import type { LineItem, OrderFrame, OrderPaperweight } from "../types";

export const buildLineItems = (
  frames: OrderFrame[],
  paperweight: OrderPaperweight,
): LineItem[] => {
  const items: LineItem[] = [];

  frames.forEach((frame, index) => {
    const mountColour = frame.mountColour ?? null;

    const descParts = [
      frame.size,
      frame.frameType,
      frame.glassType,
      frame.preservationType,
      mountColour ? `Mount: ${mountColour}` : null,
    ].filter(Boolean);

    const description = descParts.join(", ");
    const basePrice = typeof frame.price === "number" ? frame.price : 0;

    const baseId = frame.frameId ?? `frame-${index}`;

    items.push({
      id: baseId,
      description,
      qty: 1,
      unitPrice: basePrice,
      total: basePrice,
      kind: "frame",
      frame,
    });

    const extras = frame.extras ?? null;

    if (typeof extras?.mountPrice === "number" && extras.mountPrice > 0) {
      const mountSuffix =
        frame.inclusions === "Buttonhole" ? " - Buttonhole" : "";
      items.push({
        id: `${baseId}-mount`,
        description: `${mountColour ? `Mount - ${mountColour}` : "Mount"}${mountSuffix}`,
        qty: 1,
        unitPrice: extras.mountPrice,
        total: extras.mountPrice,
        kind: "extra",
        frame,
      });
    }

    if (typeof extras?.glassPrice === "number" && extras.glassPrice > 0) {
      items.push({
        id: `${baseId}-glass`,
        description: `Glass - ${frame.glassType}`,
        qty: 1,
        unitPrice: extras.glassPrice,
        total: extras.glassPrice,
        kind: "extra",
        frame,
      });
    }

    if (
      typeof extras?.glassEngravingPrice === "number" &&
      extras.glassEngravingPrice > 0
    ) {
      const engravingText = frame.glassEngraving?.trim();
      items.push({
        id: `${baseId}-glass-engraving`,
        description: engravingText
          ? `Glass engraving - ${engravingText}`
          : "Glass engraving",
        qty: 1,
        unitPrice: extras.glassEngravingPrice,
        total: extras.glassEngravingPrice,
        kind: "extra",
        frame,
      });
    }
  });

  if (paperweight) {
    const total = typeof paperweight.price === "number" ? paperweight.price : 0;
    const qty = paperweight.quantity != null ? Number(paperweight.quantity) : 1;

    items.push({
      id: paperweight.paperWeightId ?? "paperweight",
      description: "Paperweight",
      qty,
      unitPrice: qty ? total / qty : total,
      total,
      kind: "paperweight",
    });
  }

  return items;
};
