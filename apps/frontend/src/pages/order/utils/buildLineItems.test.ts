import { describe, expect, it } from "vitest";

import type { FrameExtras } from "@/api/types";
import type { OrderFrame, OrderPaperweight } from "../types";
import { buildLineItems } from "./buildLineItems";

const makeExtras = (overrides: Partial<FrameExtras> = {}): FrameExtras => ({
  glassEngravingPrice: null,
  glassPrice: null,
  measuredWidthIn: null,
  measuredHeightIn: null,
  recommendedSizeWidthIn: null,
  recommendedSizeHeightIn: null,
  framePrice: null,
  mountPrice: null,
  ...overrides,
});

const makeFrame = (overrides: Partial<OrderFrame> = {}) =>
  ({
    measuredSize: "18 x 28 inches",
    recommendedSize: "20 x 30 inches",
    frameType: "Oak",
    preservationDate: "",
    preservationType: "Pressed",
    layout: "Single",
    price: 0,
    colId: "collection-id",
    glassEngraving: "",
    glassType: "Conservation glass",
    inclusions: "No",
    specialNotes: "",
    frameId: "frame-1",
    updated: "",
    created: "",
    mountColour: "",
    extras: null,
    ...overrides,
  }) as OrderFrame;

describe("buildLineItems", () => {
  it("formats frame descriptions with inches and without layout", () => {
    const frame = makeFrame({
      recommendedSize: "20x30 inches",
      measuredSize: "18x28 inches",
      layout: "Hand tied side profile",
      frameType: "Dark wood gold line",
      preservationType: "Pressed",
      glassType: "Conservation glass",
      price: 200,
    });

    const [item] = buildLineItems([frame], null);

    expect(item).toMatchObject({
      description:
        "Picture, 20 x 30 inches, Dark wood gold line, Pressed, Conservation glass",
      unitPrice: 200,
      total: 200,
      kind: "frame",
    });
  });

  it("treats paperweight price as the total line amount", () => {
    const paperweight = {
      paperWeightId: "paperweight-1",
      quantity: 2,
      price: 400,
    } as NonNullable<OrderPaperweight>;

    const [item] = buildLineItems([], paperweight);

    expect(item).toMatchObject({
      description: "Paperweight",
      qty: 2,
      unitPrice: 200,
      total: 400,
      kind: "paperweight",
    });
  });

  it("labels mount extras as additional mounts without a buttonhole suffix", () => {
    const frame = makeFrame({
      recommendedSize: '10" x 8"',
      frameType: "Oak",
      preservationType: "Pressed",
      glassType: "Conservation glass",
      inclusions: "Buttonhole",
      mountColour: "Cream",
      extras: makeExtras({
        mountPrice: 75,
      }),
    });

    const [, mountItem] = buildLineItems([frame], null);

    expect(mountItem).toMatchObject({
      description: "Additional Mount - Cream",
      unitPrice: 75,
      total: 75,
      kind: "extra",
    });
  });

  it("keeps Clearview glass as a separate priced line", () => {
    const frame = makeFrame({
      recommendedSize: '10" x 8"',
      frameType: "Oak",
      preservationType: "Pressed",
      glassType: "Clearview uv glass",
      price: 300,
      extras: makeExtras({
        glassPrice: 40,
      }),
    });

    const [frameItem, glassItem] = buildLineItems([frame], null);

    expect(frameItem).toMatchObject({
      description: "Picture, 10 x 8 inches, Oak, Pressed",
      unitPrice: 300,
      total: 300,
      kind: "frame",
    });

    expect(glassItem).toMatchObject({
      description: "Glass - Clearview uv glass",
      unitPrice: 40,
      total: 40,
      kind: "extra",
    });
  });
});
