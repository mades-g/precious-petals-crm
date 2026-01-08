import type { CreateOrderFormValues } from "@/pages/home/components/create-new-customer-form/create-new-customer-form";
import { pb } from "@/services/pb/client";
import { COLLECTIONS } from "@/services/pb/constants";
import type {
  CustomersResponse,
  OrderFrameItemsResponse,
  OrderPaperweightItemsResponse,
  OrdersResponse,
} from "@/services/pb/types";

import { mapBouquetToFrameItemPayload } from "./mappers/frame-item.mapper";
import { mapOrderAddressesToPayload } from "./mappers/order-address.mapper";
import { hasPaperweightDetails } from "./mappers/paperweight.mapper";
import type { FrameExtras } from "./types";

// TODO: Add ability to rollback if orders or customers post api fails.
export type CreateNewOrderResult = {
  customer: CustomersResponse;
  order: OrdersResponse<{
    frameOrderId: OrderFrameItemsResponse<FrameExtras>[];
    paperweightOrderId: OrderPaperweightItemsResponse | null;
  }>;
  frameItems: OrderFrameItemsResponse<FrameExtras>[];
  paperweightItem: OrderPaperweightItemsResponse | null;
};

export const createNewOrder = async (
  values: CreateOrderFormValues,
): Promise<CreateNewOrderResult> => {
  const isBouquetComplete = (bq: CreateOrderFormValues["bouquets"][number]) =>
    bq.measuredWidthIn !== null &&
    bq.measuredHeightIn !== null &&
    bq.layout &&
    bq.recommendedSizeWidthIn !== null &&
    bq.recommendedSizeHeightIn !== null &&
    bq.preservationType &&
    bq.frameType &&
    typeof bq.framePrice === "number" &&
    bq.mountColour &&
    typeof bq.mountPrice === "number";

  const bouquets = (values.bouquets ?? []).filter(isBouquetComplete);

  const frameItems: OrderFrameItemsResponse<FrameExtras>[] = [];

  for (const bq of bouquets) {
    const framePayload = mapBouquetToFrameItemPayload(bq);

    const created = await pb
      .collection(COLLECTIONS.ORDER_FRAME_ITEMS)
      .create<OrderFrameItemsResponse<FrameExtras>>(framePayload);

    frameItems.push(created);
  }

  let paperweightItem: OrderPaperweightItemsResponse | null = null;

  if (hasPaperweightDetails(values)) {
    paperweightItem = await pb
      .collection(COLLECTIONS.ORDER_PAPERWEIGHT_ITEMS)
      .create<OrderPaperweightItemsResponse>({
        quantity: values.paperweightQuantity,
        price: values.paperweightPrice,
        paperweightReceived: false,
      });
  }

  const orderPayload = {
    orderNo: typeof values.orderNo === "number" ? values.orderNo : Number(values.orderNo),
    occasionDate: values.occasionDate,
    ...mapOrderAddressesToPayload(values),
    notes: "", // hook this up when you add notes to the form
    payment_status: "waiting_first_deposit",
    orderStatus: "draft" as const,
    frameOrderId: frameItems.map((fi) => fi.id),
    paperweightOrderId: paperweightItem ? paperweightItem.id : undefined,
  };

  const order = await pb
    .collection(COLLECTIONS.ORDERS)
    .create<OrdersResponse>(orderPayload);

  const customerPayload = {
    firstName: values.firstName,
    surname: values.surname,
    title: values.title || undefined,
    email: values.email,
    telephone: values.telephone,
    howRecommended: values.howRecommended || undefined,
    orderId: order.id,
  };

  const customer = await pb
    .collection(COLLECTIONS.CUSTOMERS)
    .create<CustomersResponse>(customerPayload);

  const expandedOrder = await pb.collection(COLLECTIONS.ORDERS).getOne<
    OrdersResponse<{
      frameOrderId: OrderFrameItemsResponse<FrameExtras>[];
      paperweightOrderId: OrderPaperweightItemsResponse | null;
    }>
  >(order.id, {
    expand: "frameOrderId,paperweightOrderId",
  });

  return {
    customer,
    order: expandedOrder,
    frameItems,
    paperweightItem,
  };
};
