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
  OrdersOrderStatusOptions,
  Update,
} from "@/services/pb/types";
import { shouldAutoMoveOrderToChosenAfterSecondDeposit } from "@/utils/orderStatus";

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

  const updateOrderAfterPayment = async (payload: {
    paymentType: OrderPaymentsPaymentTypeOptions;
    requiredBy?: string;
    artistHours?: number;
    currentOrderStatus?: OrdersOrderStatusOptions;
  }) => {
    if (!orderId) {
      throw new Error("Missing order ID");
    }

    const updatePayload: Update<"orders"> = {};
    const nextPaymentStatus = PAYMENT_STATUS_BY_TYPE[payload.paymentType];
    if (nextPaymentStatus) {
      updatePayload.payment_status = nextPaymentStatus;
    }

    if (
      payload.paymentType === "second_deposit" &&
      shouldAutoMoveOrderToChosenAfterSecondDeposit(payload.currentOrderStatus)
    ) {
      updatePayload.orderStatus = "chosen";
    }

    if (
      payload.paymentType === "second_deposit" &&
      payload.requiredBy &&
      payload.requiredBy.trim() !== ""
    ) {
      updatePayload.requiredBy = payload.requiredBy.trim();
    }

    if (
      payload.paymentType === "second_deposit" &&
      typeof payload.artistHours === "number"
    ) {
      updatePayload.artistHours = payload.artistHours;
    }

    if (Object.keys(updatePayload).length === 0) {
      return;
    }

    await pb.collection(COLLECTIONS.ORDERS).update(orderId, updatePayload);
  };

  const { mutateAsync: addPayment, isPending: isSavingPayment } = useMutation({
    mutationFn: async (
      payload: CreateOrderPaymentDraft & {
        requiredBy?: string;
        artistHours?: number;
        currentOrderStatus?: OrdersOrderStatusOptions;
      },
    ) => {
      if (!orderId) {
        throw new Error("Missing order ID");
      }

      const { requiredBy, artistHours, currentOrderStatus, ...paymentPayload } =
        payload;
      const payment = await createOrderPayment({ ...paymentPayload, orderId });
      await updateOrderAfterPayment({
        paymentType: payload.paymentType,
        requiredBy,
        artistHours,
        currentOrderStatus,
      });

      return payment;
    },
    onSuccess: invalidate,
  });

  const { mutateAsync: updatePayment, isPending: isUpdatingPayment } =
    useMutation({
      mutationFn: async (payload: {
        id: string;
        data: CreateOrderPaymentDraft & {
          requiredBy?: string;
          artistHours?: number;
          currentOrderStatus?: OrdersOrderStatusOptions;
        };
      }) => {
        if (!orderId) {
          throw new Error("Missing order ID");
        }
        const {
          requiredBy,
          artistHours,
          currentOrderStatus,
          ...paymentData
        } = payload.data;
        const updated = await updateOrderPayment(payload.id, paymentData);
        await updateOrderAfterPayment({
          paymentType: payload.data.paymentType,
          requiredBy,
          artistHours,
          currentOrderStatus,
        });
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
