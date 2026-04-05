import { describe, expect, it } from "vitest";

import type { FrameGlassDraft, OrderExtrasDraft } from "../types";
import { buildExtrasSummary } from "./buildExtrasSummary";

describe("buildExtrasSummary", () => {
  it("includes Clearview glass upgrades in the accordion summary", () => {
    const orderExtras: OrderExtrasDraft = {
      replacementFlowers: true,
      replacementFlowersPrice: 30,
      collection: true,
      collectionPrice: 10,
      delivery: true,
      deliveryPrice: 200,
      recreateButtonhole: true,
      recreateButtonholePrice: 25,
      returnUnusedFlowers: false,
      returnUnusedFlowersPrice: null,
      notes: "",
    };
    const frameGlassDrafts: FrameGlassDraft[] = [
      {
        frameId: "frame-1",
        label: "Bouquet #1",
        clearviewEnabled: true,
        price: 45,
      },
      {
        frameId: "frame-2",
        label: "Bouquet #2",
        clearviewEnabled: false,
        price: null,
      },
    ];

    expect(buildExtrasSummary(orderExtras, frameGlassDrafts)).toContain(
      "Bouquet #1 - Clearview UV glass - £45.00",
    );
    expect(buildExtrasSummary(orderExtras, frameGlassDrafts)).toContain(
      "Replacement flowers - £30.00",
    );
    expect(buildExtrasSummary(orderExtras, frameGlassDrafts)).toContain(
      "Collection - £10.00",
    );
    expect(buildExtrasSummary(orderExtras, frameGlassDrafts)).toContain(
      "Delivery - £200.00",
    );
    expect(buildExtrasSummary(orderExtras, frameGlassDrafts)).toContain(
      "Recreate buttonhole - £25.00",
    );
  });

  it("ignores stale disabled prices and keeps zero as a valid price", () => {
    const orderExtras: OrderExtrasDraft = {
      replacementFlowers: false,
      replacementFlowersPrice: 30,
      collection: true,
      collectionPrice: 0,
      delivery: false,
      deliveryPrice: 90,
      recreateButtonhole: false,
      recreateButtonholePrice: 300,
      returnUnusedFlowers: false,
      returnUnusedFlowersPrice: 30,
      notes: "",
    };

    const summary = buildExtrasSummary(orderExtras, []);

    expect(summary).toContain("Collection - £0.00");
    expect(summary).not.toContain("Replacement flowers - £30.00");
    expect(summary).not.toContain("Delivery - £90.00");
    expect(summary).not.toContain("Recreate buttonhole - £300.00");
    expect(summary).not.toContain("Return unused flowers - £30.00");
  });
});
