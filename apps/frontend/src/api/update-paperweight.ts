import { pb } from "@/services/pb/client";
import { COLLECTIONS } from "@/services/pb/constants";
import type {
  OrderPaperweightItemsResponse,
  Update,
} from "@/services/pb/types";

export type UpdatePaperweightInput = {
  id: string; // order_paperweight_items record id
  quantity: number;
  price: number;
  paperweightReceived: boolean;
};

export type UpdatePaperweightResult = OrderPaperweightItemsResponse;

/**
 * Updates an existing paperweight item.
 * Only touches quantity, price and paperweightReceived.
 */
export const updatePaperweight = async (
  input: UpdatePaperweightInput,
): Promise<UpdatePaperweightResult> => {
  const { id, quantity, price, paperweightReceived } = input;

  const payload: Update<"order_paperweight_items"> = {
    quantity,
    price,
    paperweightReceived,
  };

  const updated = await pb
    .collection(COLLECTIONS.ORDER_PAPERWEIGHT_ITEMS)
    .update<OrderPaperweightItemsResponse>(id, payload);

  return updated;
};
