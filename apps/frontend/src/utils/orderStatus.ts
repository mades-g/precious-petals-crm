import { ORDER_STATUS_OPTIONS } from "@/services/pb/constants";
import type { OrdersOrderStatusOptions } from "@/services/pb/types";

const MANUAL_ORDER_STATUS_TRANSITIONS: Record<
  OrdersOrderStatusOptions,
  OrdersOrderStatusOptions[]
> = {
  draft: ["draft", "cancelled"],
  to_choose: ["draft", "chosen", "cancelled"],
  chosen: ["draft", "chosen", "in_progress", "cancelled"],
  in_progress: ["draft", "chosen", "in_progress", "ready", "cancelled"],
  ready: [
    "draft",
    "chosen",
    "in_progress",
    "ready",
    "left_the_studio",
    "cancelled",
  ],
  cancelled: ["cancelled"],
  left_the_studio: ["left_the_studio"],
};

export const MANUAL_ORDER_STATUS_OPTIONS = ORDER_STATUS_OPTIONS.filter(
  (status): status is Exclude<OrdersOrderStatusOptions, "to_choose"> =>
    status !== "to_choose",
);

export const canManuallyUpdateOrderStatus = (
  currentStatus: OrdersOrderStatusOptions,
  nextStatus: OrdersOrderStatusOptions,
) => MANUAL_ORDER_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);

export const shouldAutoMoveOrderToChosenAfterSecondDeposit = (
  currentStatus?: OrdersOrderStatusOptions | null,
) => currentStatus === "to_choose";

export const getCompletionDrivenOrderStatus = (
  currentStatus: OrdersOrderStatusOptions,
  nextCompletionEligible: boolean,
  nextChosenEligible: boolean,
): OrdersOrderStatusOptions | null => {
  if (
    currentStatus === "draft" ||
    currentStatus === "to_choose" ||
    currentStatus === "cancelled" ||
    currentStatus === "left_the_studio"
  ) {
    return null;
  }

  if (nextChosenEligible && nextCompletionEligible) {
    return currentStatus === "ready" ? null : "ready";
  }

  if (currentStatus === "ready" && !nextCompletionEligible) {
    return nextChosenEligible ? "in_progress" : "chosen";
  }

  return null;
};
