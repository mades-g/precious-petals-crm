import { useMutation, useQueryClient } from "@tanstack/react-query";

import { pb } from "@/services/pb/client";
import { COLLECTIONS } from "@/services/pb/constants";
import type {
  OrdersOrderStatusOptions,
  OrdersPaymentStatusOptions,
  Update,
} from "@/services/pb/types";

const invalidateOrderQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  orderId?: string,
) => {
  queryClient.invalidateQueries({ queryKey: ["customers"] });
  if (orderId) {
    queryClient.invalidateQueries({ queryKey: ["customer", orderId] });
  }
};

export const useOrderMetaMutations = (orderId?: string) => {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: {
      orderStatus: OrdersOrderStatusOptions;
      paymentStatus: OrdersPaymentStatusOptions;
    }) => {
      if (!orderId) {
        throw new Error("Missing order ID");
      }

      const data: Update<"orders"> = {
        orderStatus: payload.orderStatus,
        payment_status: payload.paymentStatus,
      };

      return pb.collection(COLLECTIONS.ORDERS).update(orderId, data);
    },
    onSuccess: () => invalidateOrderQueries(queryClient, orderId),
  });

  return {
    saveMeta: mutateAsync,
    isSavingMeta: isPending,
  };
};
