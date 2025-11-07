import { pb } from "@/services/pb/client";
import { COLLECTIONS } from "@/services/pb/constants";
import type {
  CostumersResponse,
  OrderFrameItemsResponse,
  OrderPaperweightItemsResponse,
  OrdersResponse,
} from "@/services/pb/types";

import { normalisedCostumer } from "../normalisers/costumer.normaliser";

// for now let's keep this here
export type ExpandedOrdersResponse = {
  orderId: OrdersResponse<{
    frameOrderId: OrderFrameItemsResponse[];
    paperweightOrderId: OrderPaperweightItemsResponse;
  }>;
};

export async function getCostumers() {
  const records = await pb
    .collection(COLLECTIONS.COSTUMERS)
    .getFullList<CostumersResponse<ExpandedOrdersResponse>>({
      expand: "orderId,orderId.frameOrderId,orderId.paperweightOrderId",
    });
  return records.map(normalisedCostumer);
}
