import { describe, expect, it } from "vitest";

import {
  MANUAL_ORDER_STATUS_OPTIONS,
  canManuallyUpdateOrderStatus,
  getCompletionDrivenOrderStatus,
  shouldAutoMoveOrderToChosenAfterSecondDeposit,
} from "./orderStatus";

describe("order status rules", () => {
  it("keeps to_choose out of the manual status menu", () => {
    expect(MANUAL_ORDER_STATUS_OPTIONS).not.toContain("to_choose");
  });

  it("does not allow draft orders to be manually moved to to_choose", () => {
    expect(canManuallyUpdateOrderStatus("draft", "to_choose")).toBe(false);
    expect(canManuallyUpdateOrderStatus("draft", "cancelled")).toBe(true);
  });

  it("only auto-moves to chosen after second deposit once choices are being gathered", () => {
    expect(shouldAutoMoveOrderToChosenAfterSecondDeposit("draft")).toBe(false);
    expect(shouldAutoMoveOrderToChosenAfterSecondDeposit("to_choose")).toBe(
      true,
    );
  });

  it("prevents completion logic from moving draft or to_choose orders forward", () => {
    expect(getCompletionDrivenOrderStatus("draft", true, true)).toBeNull();
    expect(getCompletionDrivenOrderStatus("to_choose", true, true)).toBeNull();
  });

  it("still allows completion logic to move chosen orders to ready", () => {
    expect(getCompletionDrivenOrderStatus("chosen", true, true)).toBe("ready");
  });
});
