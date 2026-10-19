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
import { shouldAutoMoveOrderToChosenAfterPayment } from "@/utils/orderStatus";

const PAYMENT_STATUS_BY_TYPE: Partial<
  Record<OrderPaymentsPaymentTypeOptions, OrdersPaymentStatusOptions>
> = {
  first_deposit: "first_deposit_paid",
  second_deposit: "second_deposit_paid",
  final_balance: "final_balance_paid",
};

type OrderPaymentDetails = {
  requiredBy?: string;
  artistHours?: number;
  currentOrderStatus?: OrdersOrderStatusOptions;
};

const buildOrderUpdateAfterPayment = (
  payload: OrderPaymentDetails & { paymentType: OrderPaymentsPaymentTypeOptions },
): Update<"orders"> => {
  const updatePayload: Update<"orders"> = {};
  const nextPaymentStatus = PAYMENT_STATUS_BY_TYPE[payload.paymentType];
  if (nextPaymentStatus) {
    updatePayload.payment_status = nextPaymentStatus;
  }

  if (
    payload.paymentType === "second_deposit" ||
    payload.paymentType === "final_balance"
  ) {
    const requiredBy = payload.requiredBy?.trim();
    if (!requiredBy) {
      throw new Error("Required by date is required to confirm the order.");
    }
    if (
      typeof payload.artistHours !== "number" ||
      !Number.isFinite(payload.artistHours) ||
      payload.artistHours <= 0
    ) {
      throw new Error("Artist hours must be greater than 0.");
    }
    updatePayload.requiredBy = requiredBy;
    updatePayload.artistHours = payload.artistHours;
  }

  if (
    shouldAutoMoveOrderToChosenAfterPayment(
      payload.currentOrderStatus,
      payload.paymentType,
    )
  ) {
    updatePayload.orderStatus = "chosen";
  }

  return updatePayload;
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

  const updateOrderAfterPayment = async (updatePayload: Update<"orders">) => {
    if (!orderId) {
      throw new Error("Missing order ID");
    }

    if (Object.keys(updatePayload).length === 0) {
      return;
    }

    await pb.collection(COLLECTIONS.ORDERS).update(orderId, updatePayload);
  };

  const { mutateAsync: addPayment, isPending: isSavingPayment } = useMutation({
    mutationFn: async (
      payload: CreateOrderPaymentDraft & OrderPaymentDetails,
    ) => {
      if (!orderId) {
        throw new Error("Missing order ID");
      }

      const { requiredBy, artistHours, currentOrderStatus, ...paymentPayload } =
        payload;
      const orderUpdate = buildOrderUpdateAfterPayment({
        paymentType: payload.paymentType,
        requiredBy,
        artistHours,
        currentOrderStatus,
      });
      const payment = await createOrderPayment({ ...paymentPayload, orderId });
      await updateOrderAfterPayment(orderUpdate);

      return payment;
    },
    onSettled: invalidate,
  });

  const { mutateAsync: updatePayment, isPending: isUpdatingPayment } =
    useMutation({
      mutationFn: async (payload: {
        id: string;
        data: CreateOrderPaymentDraft & OrderPaymentDetails;
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
        const orderUpdate = buildOrderUpdateAfterPayment({
          paymentType: payload.data.paymentType,
          requiredBy,
          artistHours,
          currentOrderStatus,
        });
        const updated = await updateOrderPayment(payload.id, paymentData);
        await updateOrderAfterPayment(orderUpdate);
        return updated;
      },
      onSettled: invalidate,
    });

  return {
    addPayment,
    updatePayment,
    isSavingPayment,
    isUpdatingPayment,
  };
};
