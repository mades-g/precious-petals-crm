import { describe, expect, it } from "vitest";

import { buildEmailPayload } from "./buildEmailPayload";

describe("buildEmailPayload", () => {
  it("merges inclusion details into order notes for invoice payloads", () => {
    const payload = buildEmailPayload({
      customer: null,
      order: null,
      frames: [
        {
          frameId: "frame-1",
          measuredSize: "20 x 30 inches",
          recommendedSize: "20 x 30 inches",
          frameType: "Dark wood gold line",
          glassType: "Conservation glass",
          layout: "Hand tied birds eye",
          preservationType: "Pressed",
          inclusions: "Yes",
          specialNotes: "test 1\nTest 3",
          mountColour: "Cream",
          glassEngraving: "",
          price: 200,
          extras: null,
        },
      ] as never,
      paperweight: null,
      extras: {
        replacementFlowers: false,
        replacementFlowersQty: null,
        replacementFlowersPrice: null,
        collectionQty: null,
        collectionPrice: null,
        deliveryQty: null,
        deliveryPrice: null,
        recreateButtonholeQty: 2,
        recreateButtonholePrice: 40,
        returnUnusedFlowers: false,
        returnUnusedFlowersPrice: null,
        notes: "Please add ribbon",
      },
      totals: {
        subTotal: 0,
        vatRate: 20,
        vatTotal: 0,
        grandTotal: 0,
      },
    });

    expect(payload.orderExtras.notes).toBe(
      "Please add ribbon\nInclude: test 1, Test 3",
    );
    expect(payload.orderExtras.recreateButtonholeQty).toBe(2);
    expect(payload.orderExtras.recreateButtonholePrice).toBe(40);
  });

  it("merges legacy special_notes and buttonhole into order notes", () => {
    const payload = buildEmailPayload({
      customer: null,
      order: null,
      frames: [
        {
          frameId: "frame-2",
          measuredSize: "10 x 8 inches",
          recommendedSize: "10 x 8 inches",
          frameType: "Oak",
          glassType: "Conservation glass",
          layout: "Hand tied side profile",
          preservationType: "Pressed",
          inclusions: "Yes",
          special_notes: "legacy inclusion text",
          mountColour: "Cream",
          glassEngraving: "",
          price: 150,
          extras: null,
        },
      ] as never,
      paperweight: null,
      extras: {
        replacementFlowers: false,
        replacementFlowersQty: null,
        replacementFlowersPrice: null,
        collectionQty: null,
        collectionPrice: null,
        deliveryQty: null,
        deliveryPrice: null,
        recreateButtonholeQty: null,
        recreateButtonholePrice: null,
        returnUnusedFlowers: false,
        returnUnusedFlowersPrice: null,
        notes: "Please add ribbon",
      },
      totals: {
        subTotal: 0,
        vatRate: 20,
        vatTotal: 0,
        grandTotal: 0,
      },
    });

    expect(payload.orderExtras.notes).toBe(
      "Please add ribbon\nInclude: legacy inclusion text",
    );
  });

  it("adds buttonhole notes the same way as other inclusions", () => {
    const payload = buildEmailPayload({
      customer: null,
      order: null,
      frames: [
        {
          frameId: "frame-3",
          measuredSize: "10 x 8 inches",
          recommendedSize: "10 x 8 inches",
          frameType: "Oak",
          glassType: "Conservation glass",
          layout: "Hand tied side profile",
          preservationType: "Pressed",
          inclusions: "Buttonhole",
          specialNotes: "",
          mountColour: "Cream",
          glassEngraving: "",
          price: 150,
          extras: null,
        },
      ] as never,
      paperweight: null,
      extras: {
        replacementFlowers: false,
        replacementFlowersQty: null,
        replacementFlowersPrice: null,
        collectionQty: null,
        collectionPrice: null,
        deliveryQty: null,
        deliveryPrice: null,
        recreateButtonholeQty: null,
        recreateButtonholePrice: null,
        returnUnusedFlowers: false,
        returnUnusedFlowersPrice: null,
        notes: "Please add ribbon",
      },
      totals: {
        subTotal: 0,
        vatRate: 20,
        vatTotal: 0,
        grandTotal: 0,
      },
    });

    expect(payload.orderExtras.notes).toBe(
      "Please add ribbon\nInclude: Buttonhole",
    );
  });
});
