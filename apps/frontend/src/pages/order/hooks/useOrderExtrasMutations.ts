import { useMutation, useQueryClient } from "@tanstack/react-query";

import { pb } from "@/services/pb/client";
import { COLLECTIONS } from "@/services/pb/constants";
import type { Update } from "@/services/pb/types";

const invalidateOrderQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  orderId?: string,
) => {
  queryClient.invalidateQueries({ queryKey: ["customers"] });
  if (orderId) {
    queryClient.invalidateQueries({ queryKey: ["customer", orderId] });
  }
};

export const useOrderExtrasMutations = (orderId?: string) => {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: Update<"orders">) => {
      if (!orderId) {
        throw new Error("Missing order ID");
      }
      return pb.collection(COLLECTIONS.ORDERS).update(orderId, payload);
    },
    onSuccess: () => invalidateOrderQueries(queryClient, orderId),
  });

  return {
    saveExtras: mutateAsync,
    isSavingExtras: isPending,
  };
};
