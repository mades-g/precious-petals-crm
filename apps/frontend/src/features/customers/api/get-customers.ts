import { pb } from "@/services/pb/client";
import { COLLECTIONS } from "@/services/pb/constants";
import type {
  CustomersResponse,
  OrderFrameItemsResponse,
  OrderPaperweightItemsResponse,
  OrdersResponse,
} from "@/services/pb/types";

import { normalisedCustomer } from "../normalisers/customer.normaliser";

// for now let's keep this here
export type ExpandedOrdersResponse = {
  orderId: OrdersResponse<{
    frameOrderId: OrderFrameItemsResponse[];
    paperweightOrderId: OrderPaperweightItemsResponse;
  }>;
};

// for now let's keep this here
export type NormalisedCustomer = ReturnType<typeof normalisedCustomer>;

export async function getCustomers() {
  const records = await pb
    .collection(COLLECTIONS.CUSTOMERS)
    .getFullList<CustomersResponse<ExpandedOrdersResponse>>({
      expand: "orderId,orderId.frameOrderId,orderId.paperweightOrderId",
    });
  return records.map(normalisedCustomer);
}
