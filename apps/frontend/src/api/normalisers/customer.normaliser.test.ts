import { describe, expect, it } from "vitest";

import type { ExpandedOrdersResponse } from "../get-customers";
import { normaliseOrder } from "./customer.normaliser";

describe("normaliseOrder mount cut", () => {
  it.each([true, false, undefined])("preserves stored mountCut %s", (mountCut) => {
    const result = normaliseOrder({
      orderId: {
        id: "order-1",
        mountCut,
        artworkComplete: true,
        framingComplete: false,
        expand: {},
      },
    } as ExpandedOrdersResponse);

    expect(result?.mountCut).toBe(mountCut);
    expect(result?.artworkComplete).toBe(true);
    expect(result?.framingComplete).toBe(false);
  });
});
