import { pb } from "@/services/pb/client";
import { COLLECTIONS } from "@/services/pb/constants";

export type SmsLogItem = {
  id: string;
  orderId: string;
  type: string;
  toNumber: string;
  sender: string;
  body: string;
  status: "sent" | "failed" | string;
  error?: string | null;
  sentAt: string;
};

export const getSmsLogs = async (orderId: string): Promise<SmsLogItem[]> => {
  if (!orderId) return [];

  return pb.collection(COLLECTIONS.SMS_LOGS).getFullList<SmsLogItem>({
    sort: "-sentAt",
    filter: `orderId="${orderId}"`,
  });
};
