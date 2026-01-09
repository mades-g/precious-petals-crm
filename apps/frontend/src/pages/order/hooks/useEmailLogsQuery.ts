import { useQuery } from "@tanstack/react-query";

import { pb } from "@/services/pb/client";
import type { EmailLogEntry } from "../types";

export const useEmailLogsQuery = (orderId?: string) => {
  return useQuery({
    queryKey: ["email_logs", orderId],
    queryFn: async () => {
      if (!orderId) return [] as EmailLogEntry[];
      const result = await pb
        .collection("email_logs")
        .getList<EmailLogEntry>(1, 50, {
          filter: `orderId = "${orderId}"`,
          sort: "-sentAt",
        });
      return result.items;
    },
    enabled: Boolean(orderId),
  });
};
