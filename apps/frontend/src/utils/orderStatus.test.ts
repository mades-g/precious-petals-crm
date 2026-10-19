import { describe, expect, it } from "vitest";

import {
  MANUAL_ORDER_STATUS_OPTIONS,
  canManuallyUpdateOrderStatus,
  getCompletionDrivenOrderStatus,
  shouldAutoMoveOrderToChosenAfterPayment,
} from "./orderStatus";

describe("order status rules", () => {
  it("keeps to_choose out of the manual status menu", () => {
    expect(MANUAL_ORDER_STATUS_OPTIONS).not.toContain("to_choose");
  });

  it("does not allow draft orders to be manually moved to to_choose", () => {
    expect(canManuallyUpdateOrderStatus("draft", "to_choose")).toBe(false);
    expect(canManuallyUpdateOrderStatus("draft", "cancelled")).toBe(true);
  });

  it.each(["second_deposit", "final_balance"] as const)("auto-moves to chosen after %s only while choices are being gathered", (paymentType) => {
    expect(shouldAutoMoveOrderToChosenAfterPayment("to_choose", paymentType)).toBe(true);
    for (const status of ["draft", "chosen", "in_progress", "ready", "cancelled", "left_the_studio"] as const) {
      expect(shouldAutoMoveOrderToChosenAfterPayment(status, paymentType)).toBe(false);
    }
    expect(shouldAutoMoveOrderToChosenAfterPayment(undefined, paymentType)).toBe(false);
  });

  it.each(["first_deposit", "other"] as const)("does not confirm the order for %s", (paymentType) => {
    expect(shouldAutoMoveOrderToChosenAfterPayment("to_choose", paymentType)).toBe(false);
  });

  it("prevents completion logic from moving draft or to_choose orders forward", () => {
    expect(getCompletionDrivenOrderStatus("draft", true, true)).toBeNull();
    expect(getCompletionDrivenOrderStatus("to_choose", true, true)).toBeNull();
  });

  it("still allows completion logic to move chosen orders to ready", () => {
    expect(getCompletionDrivenOrderStatus("chosen", true, true)).toBe("ready");
  });
});
