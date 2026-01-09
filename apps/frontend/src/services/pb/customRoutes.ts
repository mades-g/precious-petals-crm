import { pb } from "@/services/pb/client";

const normalizeError = (err: unknown) => {
  if (!err || typeof err !== "object") {
    return "Request failed";
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
    "Request failed"
  );
};

const sendCustomRoute = async <T>(path: string, body: unknown): Promise<T> => {
  try {
    return await pb.send(path, {
      method: "POST",
      body,
    });
  } catch (err) {
    throw new Error(normalizeError(err));
  }
};

export const postEmailInvoice = (payload: unknown) =>
  sendCustomRoute("/api/email/invoice", payload);

export const postEmailRecommendation = (payload: unknown) =>
  sendCustomRoute("/api/email/recommendation", payload);
