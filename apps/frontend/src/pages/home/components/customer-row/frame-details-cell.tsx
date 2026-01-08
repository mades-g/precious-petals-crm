import type { FC } from "react";

import { formatCurrency } from "@/utils";
import type { NormalisedCustomerOrderDetailsFrames } from "@/api/get-customers";

import OrderItemPill from "./order-item-pill";
import { ensureInchesSuffix, formatAddon, normaliseDash, titleCase } from "./customer.row.utils";

export const FrameDetailsCell: FC<{
  frame: NormalisedCustomerOrderDetailsFrames[number];
}> = ({ frame }) => {
  const {
    size,
    frameType,
    layout,
    preservationType,
    price,
    glassType,
    inclusions,
    glassEngraving,
    extras,
    mountColour,
  } = frame;

  const title = size ? ensureInchesSuffix(size) : frameType || "Frame";

  const meta = [
    price != null ? formatCurrency(price) : null,
    layout,
    preservationType,
  ]
    .filter(Boolean)
    .join(" · ");

  const lines: string[] = [];
  const mountDetail =
    mountColour && mountColour.trim().length > 0 ? normaliseDash(mountColour) : null;

  const mountPrice = extras?.mountPrice ?? null;
  const glassPrice = extras?.glassPrice ?? null;
  const glassEngravingPrice = extras?.glassEngravingPrice ?? null;

  // Mount
  if (mountDetail || (typeof mountPrice === "number" && mountPrice > 0)) {
    lines.push(formatAddon("Mount", mountDetail, mountPrice));
  }

  // Glass (+ buttonhole)
  if (
    glassType ||
    (typeof glassPrice === "number" && glassPrice > 0) ||
    (inclusions && inclusions !== "No")
  ) {
    const glassDetail = glassType ? titleCase(glassType) : null;
    let glassLine = formatAddon("Glass", glassDetail, glassPrice);

    if (inclusions && inclusions !== "No") {
      glassLine += " · Buttonhole";
    }

    lines.push(glassLine);
  }

  // Engraving
  if (
    (glassEngraving && glassEngraving.trim().length > 0) ||
    (typeof glassEngravingPrice === "number" && glassEngravingPrice > 0)
  ) {
    lines.push(
      formatAddon("Engraving", glassEngraving ?? null, glassEngravingPrice),
    );
  }

  return <OrderItemPill title={title} meta={meta} lines={lines} tone="neutral" />;
};

export default FrameDetailsCell;
