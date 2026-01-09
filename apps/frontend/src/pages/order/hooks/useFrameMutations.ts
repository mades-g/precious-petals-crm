import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { NormalisedCustomer } from "@/api/get-customers";
import { updateBouquet } from "@/api/update-bouquet";

const invalidateOrderQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  orderId?: string,
) => {
  queryClient.invalidateQueries({ queryKey: ["customers"] });
  if (orderId) {
    queryClient.invalidateQueries({ queryKey: ["customer", orderId] });
  }
};

const updateFrameInCache = (
  customer: NormalisedCustomer,
  payload: {
    frameId: string;
    artworkComplete?: boolean;
    framingComplete?: boolean;
  },
) => {
  if (!customer.orderDetails) return customer;

  const frameOrder = customer.orderDetails.frameOrder.map((frame) => {
    if (frame.frameId !== payload.frameId) return frame;

    return {
      ...frame,
      artworkComplete:
        payload.artworkComplete ?? frame.artworkComplete ?? false,
      framingComplete:
        payload.framingComplete ?? frame.framingComplete ?? false,
    };
  });

  return {
    ...customer,
    orderDetails: {
      ...customer.orderDetails,
      frameOrder,
    },
  };
};

export const useFrameMutations = (orderId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ["customer", orderId];

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: {
      frameId: string;
      artworkComplete?: boolean;
      framingComplete?: boolean;
    }) => updateBouquet(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NormalisedCustomer>(queryKey);

      if (previous) {
        queryClient.setQueryData(
          queryKey,
          updateFrameInCache(previous, payload),
        );
      }

      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => invalidateOrderQueries(queryClient, orderId),
  });

  return {
    updateFrameCompletion: mutateAsync,
    isSavingCompletion: isPending,
  };
};
