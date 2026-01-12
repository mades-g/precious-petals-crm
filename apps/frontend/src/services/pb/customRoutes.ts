import { pb } from "@/services/pb/client";

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

const getFilenameFromDisposition = (value: string | null) => {
  if (!value) return null;

  const utfMatch = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      return utfMatch[1];
    }
  }

  const asciiMatch = value.match(/filename="?([^\\";]+)"?/i);
  if (asciiMatch?.[1]) {
    return asciiMatch[1];
  }

  return null;
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

const sendCustomRouteWithBlob = async (
  path: string,
  query: Record<string, string | undefined>,
  fallbackMessage: string,
) => {
  try {
    return await pb.send<{ blob: Blob; filename: string | null }>(path, {
      method: "GET",
      query,
      fetch: async (url, options) => {
        const response = await fetch(url, options);
        if (!response.ok) {
          return response;
        }

        const blob = await response.blob();
        const filename = getFilenameFromDisposition(
          response.headers.get("content-disposition"),
        );

        return {
          status: response.status,
          url: response.url,
          json: async () => ({ blob, filename }),
        } as Response;
      },
    });
  } catch (err) {
    throw new Error(normalizeError(err, fallbackMessage));
  }
};

export const postEmailInvoice = (payload: unknown) =>
  sendCustomRoute("/api/email/invoice", payload);

export const postEmailRecommendation = (payload: unknown) =>
  sendCustomRoute("/api/email/recommendation", payload);

export const getExportOrdersXlsx = (query: Record<string, string | undefined>) =>
  sendCustomRouteWithBlob(
    "/api/export/orders.xlsx",
    query,
    "Failed to export orders.",
  );
