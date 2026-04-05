import { describe, expect, it } from "vitest";

import type { OrderExtrasDraft } from "../types";
import { buildTotals } from "./buildTotals";

describe("buildTotals", () => {
  it("includes recreate buttonhole in the grand total", () => {
    const extras: OrderExtrasDraft = {
      replacementFlowers: false,
      replacementFlowersPrice: null,
      collection: false,
      collectionPrice: null,
      delivery: false,
      deliveryPrice: null,
      recreateButtonhole: true,
      recreateButtonholePrice: 60,
      returnUnusedFlowers: false,
      returnUnusedFlowersPrice: null,
      notes: "",
    };

    const totals = buildTotals([], extras);

    expect(totals.grandTotal).toBe(60);
  });

  it("ignores stale prices for extras that are not enabled", () => {
    const extras: OrderExtrasDraft = {
      replacementFlowers: false,
      replacementFlowersPrice: 30,
      collection: false,
      collectionPrice: 50,
      delivery: true,
      deliveryPrice: 0,
      recreateButtonhole: true,
      recreateButtonholePrice: 60,
      returnUnusedFlowers: false,
      returnUnusedFlowersPrice: 25,
      notes: "",
    };

    const totals = buildTotals([], extras);

    expect(totals.grandTotal).toBe(60);
  });
});
