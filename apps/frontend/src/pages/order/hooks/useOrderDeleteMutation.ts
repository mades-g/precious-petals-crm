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

export const useOrderDeleteMutation = (orderId?: string) => {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => {
      if (!orderId) {
        throw new Error("Missing order ID");
      }

      const data: Update<"orders"> = {
        isDeleted: true,
      };

      return pb.collection(COLLECTIONS.ORDERS).update(orderId, data);
    },
    onSuccess: () => invalidateOrderQueries(queryClient, orderId),
  });

  return {
    deleteOrder: mutateAsync,
    isDeleting: isPending,
  };
};
