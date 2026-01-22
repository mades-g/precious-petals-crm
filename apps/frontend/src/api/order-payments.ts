import { pb } from "@/services/pb/client";
import { COLLECTIONS } from "@/services/pb/constants";
import type {
  Create,
  OrderPaymentsPaymentTypeOptions,
  OrderPaymentsResponse,
} from "@/services/pb/types";

export type CreateOrderPaymentInput = {
  orderId: string;
  amount: number;
  paymentType: OrderPaymentsPaymentTypeOptions;
  paidAt?: string;
  notes?: string;
};

export type CreateOrderPaymentDraft = Omit<CreateOrderPaymentInput, "orderId">;

export const getOrderPayments = async (orderId: string) => {
  if (!orderId) return [];

  return pb
    .collection(COLLECTIONS.ORDER_PAYMENTS)
    .getFullList<OrderPaymentsResponse>({
      filter: `orderId = "${orderId}"`,
      sort: "-paidAt",
    });
};

export const createOrderPayment = async ({
  orderId,
  amount,
  paymentType,
  paidAt,
  notes,
}: CreateOrderPaymentInput) => {
  const payload: Create<"order_payments"> = {
    orderId,
    amount,
    paymentType,
    ...(paidAt ? { paidAt } : {}),
    ...(notes ? { notes } : {}),
  };

  return pb
    .collection(COLLECTIONS.ORDER_PAYMENTS)
    .create<OrderPaymentsResponse>(payload);
};

export const updateOrderPayment = async (
  id: string,
  payload: Partial<CreateOrderPaymentDraft>,
) => {
  return pb
    .collection(COLLECTIONS.ORDER_PAYMENTS)
    .update<OrderPaymentsResponse>(id, payload);
};
