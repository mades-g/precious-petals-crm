import type {
  OrdersOrderStatusOptions,
  OrdersPaymentStatusOptions,
} from "@/services/pb/types";
import { getExportOrdersXlsx } from "@/services/pb/customRoutes";

export type ExportOrdersParams = {
  orderId?: string;
  from?: string;
  to?: string;
  paymentStatus?: OrdersPaymentStatusOptions;
  orderStatus?: OrdersOrderStatusOptions;
};

export type ExportOrdersResult = {
  blob: Blob;
  filename: string | null;
};

export const exportOrdersXlsx = async (
  params: ExportOrdersParams,
): Promise<ExportOrdersResult> => {
  const trimmedOrderId = params.orderId?.trim();
  const query: Record<string, string | undefined> = {};

  if (trimmedOrderId) {
    query.orderId = trimmedOrderId;
  } else {
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;
  }

  if (params.paymentStatus) {
    query.paymentStatus = params.paymentStatus;
  }
  if (params.orderStatus) {
    query.orderStatus = params.orderStatus;
  }

  return getExportOrdersXlsx(query);
};
