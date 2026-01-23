import { pb } from "@/services/pb/client";

export type SmsType =
  | "deposit_reminder"
  | "paperweight_received"
  | "framing_complete"
  | "custom";

export type SendSmsPayload = {
  orderId: string;
  type: SmsType;
  message: string;
  sender?: string;
  balanceDue?: string;
  totalBalance?: string;
};

export type SendSmsResponse = {
  ok: boolean;
  to?: string;
  orderId?: string;
  type?: SmsType;
  sentAt?: string;
  provider?: string;
  error?: string;
};

const normalizeError = (err: unknown, fallbackMessage = "Request failed") => {
  if (!err || typeof err !== "object") {
    return fallbackMessage;
  }

  const anyErr = err as {
    message?: string;
    data?: { message?: string; error?: string; details?: string };
    response?: {
      data?: { message?: string; error?: string; details?: string };
    };
  };

  const responseData = anyErr.data ?? anyErr.response?.data;

  return (
    responseData?.details ||
    responseData?.error ||
    responseData?.message ||
    anyErr.message ||
    fallbackMessage
  );
};

export const sendSms = async (payload: SendSmsPayload) => {
  try {
    const response = await pb.send<SendSmsResponse>("/api/sms/send", {
      method: "POST",
      body: payload,
    });
    if (!response.ok) {
      throw new Error(response.error || "Failed to send SMS.");
    }
    return response;
  } catch (err) {
    throw new Error(normalizeError(err, "Failed to send SMS."));
  }
};
