import { useQuery } from "@tanstack/react-query";

import { getCustomerByOrderId } from "@/api/get-customers";

export const useOrderQuery = (orderId?: string) => {
  return useQuery({
    queryKey: ["customer", orderId],
    queryFn: () => getCustomerByOrderId(orderId ?? ""),
    enabled: Boolean(orderId),
  });
};
