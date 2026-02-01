import type { FC } from "react";

import { formatCurrency } from "@/utils";
import type { NormalisedCustomerOrderDetailsFrames } from "@/api/get-customers";

import OrderItemPill from "./order-item-pill";
import {
  ensureInchesSuffix,
  formatAddon,
  normaliseDash,
} from "./customer.row.utils";

export const FrameDetailsCell: FC<{
  frame: NormalisedCustomerOrderDetailsFrames[number];
}> = ({ frame }) => {
  const {
    recommendedSize,
    frameType,
    layout,
    preservationType,
    price,
    inclusions,
    glassEngraving,
    extras,
    mountColour,
  } = frame;

  const title = recommendedSize
    ? ensureInchesSuffix(recommendedSize)
    : frameType || "Frame";

  const meta = [
    price != null ? formatCurrency(price) : null,
    layout,
    preservationType,
  ]
    .filter(Boolean)
    .join(" · ");

  const lines: string[] = [];
  const mountDetail =
    mountColour && mountColour.trim().length > 0
      ? normaliseDash(mountColour)
      : null;

  const mountPrice = extras?.mountPrice ?? null;
  const glassEngravingPrice = extras?.glassEngravingPrice ?? null;

  // Mount
  if (mountDetail || (typeof mountPrice === "number" && mountPrice > 0)) {
    lines.push(formatAddon("Mount", mountDetail, mountPrice));
  }

  if (inclusions === "Buttonhole") {
    const mountIndex = lines.findIndex((line) => line.startsWith("Mount"));
    if (mountIndex >= 0) {
      lines[mountIndex] = `${lines[mountIndex]} · Buttonhole`;
    } else {
      lines.push("Buttonhole");
    }
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

  return (
    <OrderItemPill title={title} meta={meta} lines={lines} tone="neutral" />
  );
};

export default FrameDetailsCell;
