import { pb } from "@/services/pb/client";
import { COLLECTIONS } from "@/services/pb/constants";
import type {
  CustomersResponse,
  OrderFrameItemsResponse,
  OrderPaperweightItemsResponse,
  OrdersResponse,
} from "@/services/pb/types";

import { normalisedCustomer, normaliseFrameOrder, normaliseOrder, normalisePaperWeightOrder } from "./normalisers/customer.normaliser";
import type { FrameExtras } from "./types";

// for now let's keep this here
export type ExpandedOrdersResponse = {
  orderId: OrdersResponse<{
    frameOrderId: OrderFrameItemsResponse<FrameExtras>[];
    paperweightOrderId: OrderPaperweightItemsResponse;
  }>;
};

// for now let's keep this here
export type NormalisedCustomer = ReturnType<typeof normalisedCustomer>;
export type NormalisedCustomerOrderDetails = ReturnType<typeof normaliseOrder>;
export type NormalisedCustomerOrderDetailsFrames = ReturnType<typeof normaliseFrameOrder>;
export type NormalisedCustomerOrderDetailsPaperweight = ReturnType<typeof normalisePaperWeightOrder>;

export type GetCustomersParams = {
  occasionDate?: string;
  email?: string;
  telephone?: string;
  surname?: string;
  orderNo?: string;
};

export async function getCustomers({
  occasionDate = "",
  email = "",
  telephone = "",
  surname = "",
  orderNo = "",
}: GetCustomersParams) {
  const filters: string[] = [];

  if (orderNo) {
    filters.push(`orderId.orderNo ~ "${orderNo}"`);
  }

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

  return (await pb
    .collection(COLLECTIONS.CUSTOMERS)
    // TODO: switch to paginated API instead of getFullList
    .getFullList<CustomersResponse<ExpandedOrdersResponse>>({
      expand: "orderId,orderId.frameOrderId,orderId.paperweightOrderId",
      ...(filter ? { filter } : {}),
      sort: "-orderId.orderNo",
    })).map(normalisedCustomer);

}

export async function getCustomerByOrderId(orderId: string) {
  const record = await pb
    .collection(COLLECTIONS.CUSTOMERS)
    .getFirstListItem<CustomersResponse<ExpandedOrdersResponse>>(
      `orderId.id = "${orderId}"`,
      {
        expand: "orderId,orderId.frameOrderId,orderId.paperweightOrderId",
      },
    );

  return normalisedCustomer(record);
}
