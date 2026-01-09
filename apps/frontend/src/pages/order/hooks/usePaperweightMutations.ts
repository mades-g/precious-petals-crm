import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updatePaperweight } from "@/api/update-paperweight";

const invalidateOrderQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  orderId?: string,
) => {
  queryClient.invalidateQueries({ queryKey: ["customers"] });
  if (orderId) {
    queryClient.invalidateQueries({ queryKey: ["customer", orderId] });
  }
};

export const usePaperweightMutations = (orderId?: string) => {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: updatePaperweight,
    onSuccess: () => invalidateOrderQueries(queryClient, orderId),
  });

  return {
    updatePaperweight: mutateAsync,
    isSavingPaperweight: isPending,
  };
};
