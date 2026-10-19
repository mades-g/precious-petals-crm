import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OrdersOrderStatusOptions } from "@/services/pb/types";
import { COLLECTIONS } from "@/services/pb/constants";
import { useOrderPaymentsMutations } from "./useOrderPayments";

const mocks = vi.hoisted(() => ({
  createPayment: vi.fn(),
  updatePayment: vi.fn(),
  collection: vi.fn(),
  updateOrder: vi.fn(),
}));

vi.mock("@/api/order-payments", () => ({
  createOrderPayment: mocks.createPayment,
  updateOrderPayment: mocks.updatePayment,
  getOrderPayments: vi.fn(),
}));
vi.mock("@/services/pb/client", () => ({ pb: { collection: mocks.collection } }));

const confirmation = { requiredBy: " 01/12/2026 ", artistHours: 3.5 };
const finalPayment = {
  amount: 450,
  paymentType: "final_balance" as const,
  paidAt: "2026-10-19",
  notes: "Remaining balance paid in full",
};

const setup = (orderId: string | undefined = "order-1") => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useOrderPaymentsMutations(orderId), { wrapper });
  return { ...hook, invalidate, queryClient };
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createPayment.mockResolvedValue({ id: "payment-1", ...finalPayment });
  mocks.updatePayment.mockResolvedValue({ id: "payment-1", ...finalPayment });
  mocks.collection.mockReturnValue({ update: mocks.updateOrder });
  mocks.updateOrder.mockResolvedValue({ id: "order-1" });
});

describe("payment confirmation", () => {
  it("confirms a direct final payment with one real payment and preserves fully paid status", async () => {
    const { result, invalidate } = setup();
    await act(async () => {
      await result.current.addPayment({ ...finalPayment, ...confirmation, currentOrderStatus: "to_choose" });
    });

    expect(mocks.createPayment).toHaveBeenCalledExactlyOnceWith({ ...finalPayment, orderId: "order-1" });
    expect(mocks.collection).toHaveBeenCalledWith(COLLECTIONS.ORDERS);
    expect(mocks.updateOrder).toHaveBeenCalledExactlyOnceWith("order-1", {
      payment_status: "final_balance_paid",
      orderStatus: "chosen",
      requiredBy: "01/12/2026",
      artistHours: 3.5,
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["order-payments", "order-1"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["customer", "order-1"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["customers"] });
  });

  it("confirms an existing final payment when its missing confirmation details are supplied", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.updatePayment({
        id: "payment-1",
        data: { ...finalPayment, ...confirmation, currentOrderStatus: "to_choose" },
      });
    });
    expect(mocks.createPayment).not.toHaveBeenCalled();
    expect(mocks.updatePayment).toHaveBeenCalledExactlyOnceWith("payment-1", finalPayment);
    expect(mocks.updateOrder).toHaveBeenCalledExactlyOnceWith("order-1", {
      payment_status: "final_balance_paid", orderStatus: "chosen", requiredBy: "01/12/2026", artistHours: 3.5,
    });
  });

  it("keeps the normal second-deposit confirmation path", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.addPayment({ amount: 150, paymentType: "second_deposit", ...confirmation, currentOrderStatus: "to_choose" });
    });
    expect(mocks.updateOrder).toHaveBeenCalledExactlyOnceWith("order-1", {
      payment_status: "second_deposit_paid", orderStatus: "chosen", requiredBy: "01/12/2026", artistHours: 3.5,
    });
  });

  it.each(["draft", "chosen", "in_progress", "ready", "cancelled", "left_the_studio"] as OrdersOrderStatusOptions[])(
    "does not change %s to Chosen on final payment",
    async (currentOrderStatus) => {
      const { result } = setup();
      await act(async () => {
        await result.current.addPayment({ ...finalPayment, ...confirmation, currentOrderStatus });
      });
      expect(mocks.updateOrder).toHaveBeenCalledWith("order-1", {
        payment_status: "final_balance_paid", requiredBy: "01/12/2026", artistHours: 3.5,
      });
    },
  );

  it.each(["add", "edit"] as const)("validates details before an %s can save financial records", async (operation) => {
    const { result } = setup();
    for (const details of [
      { requiredBy: "", artistHours: 3.5 },
      { requiredBy: "  ", artistHours: 3.5 },
      { requiredBy: "01/12/2026", artistHours: undefined },
      { requiredBy: "01/12/2026", artistHours: 0 },
      { requiredBy: "01/12/2026", artistHours: -1 },
      { requiredBy: "01/12/2026", artistHours: NaN },
      { requiredBy: "01/12/2026", artistHours: Infinity },
    ]) {
      await act(async () => {
        const data = { ...finalPayment, ...details, currentOrderStatus: "to_choose" as const };
        const mutation = operation === "add"
          ? result.current.addPayment(data)
          : result.current.updatePayment({ id: "payment-1", data });
        await expect(mutation).rejects.toThrow();
      });
    }
    expect(mocks.createPayment).not.toHaveBeenCalled();
    expect(mocks.updatePayment).not.toHaveBeenCalled();
    expect(mocks.updateOrder).not.toHaveBeenCalled();
  });

  it("leaves first deposits independent of order confirmation", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.addPayment({ amount: 100, paymentType: "first_deposit", currentOrderStatus: "to_choose" });
    });
    expect(mocks.updateOrder).toHaveBeenCalledExactlyOnceWith("order-1", { payment_status: "first_deposit_paid" });
  });

  it("does not change order or payment statuses for Other payments", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.addPayment({ amount: 25, paymentType: "other", notes: "Adjustment", currentOrderStatus: "to_choose" });
    });
    expect(mocks.createPayment).toHaveBeenCalledOnce();
    expect(mocks.updateOrder).not.toHaveBeenCalled();
  });

  it("does not update the order when saving the payment fails", async () => {
    mocks.createPayment.mockRejectedValueOnce(new Error("Payment save failed"));
    const { result } = setup();
    await act(async () => {
      await expect(result.current.addPayment({ ...finalPayment, ...confirmation })).rejects.toThrow("Payment save failed");
    });
    expect(mocks.updateOrder).not.toHaveBeenCalled();
  });

  it("refreshes history if a payment saves but its order update fails", async () => {
    mocks.updateOrder.mockRejectedValueOnce(new Error("Order update failed"));
    const { result, invalidate } = setup();
    await act(async () => {
      await expect(result.current.addPayment({ ...finalPayment, ...confirmation, currentOrderStatus: "to_choose" })).rejects.toThrow("Order update failed");
    });
    expect(mocks.createPayment).toHaveBeenCalledOnce();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["order-payments", "order-1"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["customer", "order-1"] });
  });
});
