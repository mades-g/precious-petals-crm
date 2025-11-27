import { pb } from "@/services/pb/client";
import { COLLECTIONS } from "@/services/pb/constants";
import type {
  CustomersResponse,
  OrderFrameItemsResponse,
  OrderPaperweightItemsResponse,
  OrdersResponse,
} from "@/services/pb/types";

import { normalisedCustomer } from "./normalisers/customer.normaliser";

// for now let's keep this here
export type ExpandedOrdersResponse = {
  orderId: OrdersResponse<{
    frameOrderId: OrderFrameItemsResponse[];
    paperweightOrderId: OrderPaperweightItemsResponse;
  }>;
};

// for now let's keep this here
export type NormalisedCustomer = ReturnType<typeof normalisedCustomer>;
export type GetCustomersParams = {
  occasionDate?: string;
  email?: string;
  telephone?: string;
  surname?: string;
};

export async function getCustomers({
  occasionDate = "",
  email = "",
  telephone = "",
  surname = "",
}: GetCustomersParams) {
  const filters: string[] = [];

  // occasionDate is on the related orders collection
  if (occasionDate) {
    filters.push(`orderId.occasionDate ~ "${occasionDate}"`);
  }

  if (email) {
    filters.push(`email ~ "${email}"`);
  }

  if (telephone) {
    filters.push(`telephone ~ "${telephone}"`);
  }

  if (surname) {
    filters.push(`surname ~ "${surname}"`);
  }

  const filter = filters.join(" && ");

  const records = await pb
    .collection(COLLECTIONS.CUSTOMERS)
    // TODO: switch to paginated API instead of getFullList
    .getFullList<CustomersResponse<ExpandedOrdersResponse>>({
      expand: "orderId,orderId.frameOrderId,orderId.paperweightOrderId",
      ...(filter ? { filter } : {}),
      sort: '-orderId.orderNo'
    });

  return records.map(normalisedCustomer);
}
