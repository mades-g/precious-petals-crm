import type { FC } from "react";

import type { NormalisedCustomer } from "@/api/get-customers";
import type { FrameExtras } from "@/api/types";
import { formatCurrency } from "@/utils";

import OrderItemPill from "./order-item-pill";

type OrderDetails = NonNullable<NormalisedCustomer["orderDetails"]>;
type FrameOrderItem = NonNullable<OrderDetails["frameOrder"]>[number];

/**
 * Some older normalised rows may use mountColour, newer uses frameMountColour.
 */
export type FrameOrderItemForDisplay = Omit<FrameOrderItem, "extras"> & {
  extras?: FrameExtras | null;

  mountColour?: string | null;
  frameMountColour?: string | null;
};

const hasInchesAlready = (value: string) => /\binch(es)?\b/i.test(value);

const ensureInchesSuffix = (value: string) =>
  hasInchesAlready(value) ? value : `${value} inches`;

const normaliseDash = (value: string) =>
  value
    .trim()
    .replace(/\s*-\s*/g, " – ")
    .replace(/\s*–\s*/g, " – ");

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatAddon = (
  label: string,
  detail?: string | null,
  price?: number | null,
) => {
  const safeDetail = detail?.trim();
  const withDetail = safeDetail ? `${label} – ${safeDetail}` : label;

  if (typeof price === "number" && price > 0) {
    return `${withDetail} (${formatCurrency(price)})`;
  }

  return withDetail;
};

export const FrameDetailsCell: FC<{
  frame: FrameOrderItemForDisplay;
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
    frameMountColour,
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

  const resolvedMountColour =
    typeof (mountColour ?? frameMountColour) === "string"
      ? (mountColour ?? frameMountColour)
      : null;

  const mountDetail =
    resolvedMountColour && resolvedMountColour.trim().length > 0
      ? normaliseDash(resolvedMountColour)
      : null;

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
