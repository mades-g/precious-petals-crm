import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createOrderPayment,
  getOrderPayments,
  updateOrderPayment,
  type CreateOrderPaymentDraft,
} from "@/api/order-payments";
import { pb } from "@/services/pb/client";
import { COLLECTIONS } from "@/services/pb/constants";
import type {
  OrderPaymentsPaymentTypeOptions,
  OrdersPaymentStatusOptions,
  Update,
} from "@/services/pb/types";

const PAYMENT_STATUS_BY_TYPE: Partial<
  Record<OrderPaymentsPaymentTypeOptions, OrdersPaymentStatusOptions>
> = {
  first_deposit: "first_deposit_paid",
  second_deposit: "second_deposit_paid",
  final_balance: "final_balance_paid",
};

export const useOrderPayments = (orderId?: string) => {
  return useQuery({
    queryKey: ["order-payments", orderId],
    queryFn: () => getOrderPayments(orderId ?? ""),
    enabled: Boolean(orderId),
  });
};

export const useOrderPaymentsMutations = (orderId?: string) => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["order-payments", orderId] });
    if (orderId) {
      queryClient.invalidateQueries({ queryKey: ["customer", orderId] });
    }
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  };

  const { mutateAsync: addPayment, isPending: isSavingPayment } = useMutation({
    mutationFn: async (
      payload: CreateOrderPaymentDraft & { requiredBy?: string },
    ) => {
      if (!orderId) {
        throw new Error("Missing order ID");
      }

      const { requiredBy, ...paymentPayload } = payload;
      const payment = await createOrderPayment({ ...paymentPayload, orderId });
      const nextStatus = PAYMENT_STATUS_BY_TYPE[payload.paymentType];
      if (nextStatus) {
        const updatePayload: Update<"orders"> = {
          payment_status: nextStatus,
        };
        await pb.collection(COLLECTIONS.ORDERS).update(orderId, updatePayload);
      }
      if (
        payload.paymentType === "second_deposit" &&
        requiredBy &&
        requiredBy.trim() !== ""
      ) {
        const updatePayload: Update<"orders"> = {
          requiredBy: requiredBy.trim(),
        };
        await pb.collection(COLLECTIONS.ORDERS).update(orderId, updatePayload);
      }

      return payment;
    },
    onSuccess: invalidate,
  });

  const { mutateAsync: updatePayment, isPending: isUpdatingPayment } =
    useMutation({
      mutationFn: async (payload: {
        id: string;
        data: CreateOrderPaymentDraft & { requiredBy?: string };
      }) => {
        if (!orderId) {
          throw new Error("Missing order ID");
        }
        const { requiredBy, ...paymentData } = payload.data;
        const updated = await updateOrderPayment(payload.id, paymentData);
        if (
          payload.data.paymentType === "second_deposit" &&
          requiredBy &&
          requiredBy.trim() !== ""
        ) {
          const updatePayload: Update<"orders"> = {
            requiredBy: requiredBy.trim(),
          };
          await pb
            .collection(COLLECTIONS.ORDERS)
            .update(orderId, updatePayload);
        }
        return updated;
      },
      onSuccess: invalidate,
    });

  return {
    addPayment,
    updatePayment,
    isSavingPayment,
    isUpdatingPayment,
  };
};
