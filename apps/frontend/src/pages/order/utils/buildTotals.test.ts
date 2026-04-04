import { describe, expect, it } from "vitest";

import type { OrderExtrasDraft } from "../types";
import { buildTotals } from "./buildTotals";

describe("buildTotals", () => {
  it("includes recreate buttonhole in the grand total", () => {
    const extras: OrderExtrasDraft = {
      replacementFlowers: false,
      replacementFlowersQty: null,
      replacementFlowersPrice: null,
      collectionQty: null,
      collectionPrice: null,
      deliveryQty: null,
      deliveryPrice: null,
      recreateButtonholeQty: 1,
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
      replacementFlowersQty: null,
      replacementFlowersPrice: 30,
      collectionQty: null,
      collectionPrice: 50,
      deliveryQty: 1,
      deliveryPrice: 0,
      recreateButtonholeQty: 1,
      recreateButtonholePrice: 60,
      returnUnusedFlowers: false,
      returnUnusedFlowersPrice: 25,
      notes: "",
    };

    const totals = buildTotals([], extras);

    expect(totals.grandTotal).toBe(60);
  });
});
