import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { NormalisedCustomer } from "@/api/get-customers";
import { pb } from "@/services/pb/client";
import { COLLECTIONS } from "@/services/pb/constants";

type CompletionPayload = {
  orderId: string;
  artworkComplete?: boolean;
  framingComplete?: boolean;
};

const updateOrderInCache = (
  customer: NormalisedCustomer,
  payload: CompletionPayload,
) => {
  if (!customer.orderDetails) return customer;

  return {
    ...customer,
    orderDetails: {
      ...customer.orderDetails,
      artworkComplete:
        payload.artworkComplete ??
        customer.orderDetails.artworkComplete ??
        false,
      framingComplete:
        payload.framingComplete ??
        customer.orderDetails.framingComplete ??
        false,
    },
  };
};

export const useOrderCompletionMutations = (orderId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ["customer", orderId];

  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({ orderId, ...data }: CompletionPayload) =>
      pb.collection(COLLECTIONS.ORDERS).update(orderId, data),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NormalisedCustomer>(queryKey);

      if (previous) {
        queryClient.setQueryData(
          queryKey,
          updateOrderInCache(previous, payload),
        );
      }

      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ["customer", orderId] });
      }
    },
  });

  return {
    updateOrderCompletion: mutateAsync,
    isSavingCompletion: isPending,
  };
};
