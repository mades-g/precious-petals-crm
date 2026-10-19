import { useQuery } from "@tanstack/react-query";

import { pb } from "@/services/pb/client";
import type { EmailLogEntry } from "../types";

export const useEmailLogsQuery = (orderId?: string) => {
  return useQuery({
    queryKey: ["email_logs", orderId],
    queryFn: async () => {
      if (!orderId) return [] as EmailLogEntry[];
      return pb.collection("email_logs").getFullList<EmailLogEntry>({
        filter: `orderId = "${orderId}"`,
        sort: "-sentAt",
        expand: "sentBy",
      });
    },
    enabled: Boolean(orderId),
  });
};
