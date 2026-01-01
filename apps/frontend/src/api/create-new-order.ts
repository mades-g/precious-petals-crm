import type { CreateOrderFormValues } from "@/pages/home/components/create-new-customer-form/create-new-customer-form";
import { pb } from "@/services/pb/client";
import { COLLECTIONS } from "@/services/pb/constants";
import type {
  CustomersResponse,
  OrderFrameItemsResponse,
  OrderPaperweightItemsResponse,
  OrdersResponse,
} from "@/services/pb/types";

type FrameExtras = {
  measuredWidthIn: number | null;
  measuredHeightIn: number | null;
  recommendedSizeWidthIn: number | null;
  recommendedSizeHeightIn: number | null;
  framePrice: number | null;
  mountPrice: number | null;
};

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
  // --- 1. Create frame items (one per bouquet) -----------------------------
  const bouquets = values.bouquets ?? [];

  const frameItems: OrderFrameItemsResponse<FrameExtras>[] = [];

  for (const bq of bouquets) {
    const totalPrice =
      (typeof bq.framePrice === "number" ? bq.framePrice : 0) +
      (typeof bq.mountPrice === "number" ? bq.mountPrice : 0);

    const sizeX = bq.recommendedSizeWidthIn ?? bq.measuredWidthIn ?? null;
    const sizeY = bq.recommendedSizeHeightIn ?? bq.measuredHeightIn ?? null;

    const framePayload: Partial<
      OrderFrameItemsResponse<FrameExtras>["expand"]
    > & {
      price: number;
      frameType: string;
      layout: string;
      glassType: string | null;
      frameMountColour?: string | null;
      inclusions: string | null;
      glassEngraving?: string;
      sizeX: string;
      sizeY: string;
      artistHours: number | null;
      extras: FrameExtras | null;
      preservationType: string;
      special_notes?: string;
      preservationDate?: string | null;
      artworkComplete?: boolean;
      framingComplete?: boolean;
    } = {
      price: totalPrice,
      frameType: bq.frameType,
      layout: bq.layout,
      glassType: null,
      frameMountColour: bq.mountColour || null,
      inclusions: null,
      glassEngraving: "",
      sizeX: sizeX != null ? String(sizeX) : "",
      sizeY: sizeY != null ? String(sizeY) : "",
      artistHours: null,
      extras: {
        measuredWidthIn: bq.measuredWidthIn,
        measuredHeightIn: bq.measuredHeightIn,
        recommendedSizeWidthIn: bq.recommendedSizeWidthIn,
        recommendedSizeHeightIn: bq.recommendedSizeHeightIn,
        framePrice: bq.framePrice,
        mountPrice: bq.mountPrice,
      },
      preservationType: bq.preservationType,
      special_notes: "",
      preservationDate: values.preservationDate || null,
      artworkComplete: false,
      framingComplete: false,
    };

    const created = await pb
      .collection(COLLECTIONS.ORDER_FRAME_ITEMS)
      .create<OrderFrameItemsResponse<FrameExtras>>(framePayload);

    frameItems.push(created);
  }

  // --- 2. Create paperweight item (if exists) ------------------------------

  let paperweightItem: OrderPaperweightItemsResponse | null = null;

  if (values.paperweightQuantity && values.paperweightPrice) {
    const paperweightPayload = {
      quantity: values.paperweightQuantity,
      price: values.paperweightPrice,
      paperweightReceived: false,
    };

    paperweightItem = await pb
      .collection(COLLECTIONS.ORDER_PAPERWEIGHT_ITEMS)
      .create<OrderPaperweightItemsResponse>(paperweightPayload);
  }

  // --- 3. Create the order (with new address fields) -----------------------

  const orderNoNumber =
    typeof values.orderNo === "number"
      ? values.orderNo
      : Number(values.orderNo);

  const orderPayload = {
    orderNo: orderNoNumber,
    occasionDate: values.occasionDate,

    // billing address (required in schema)
    billingAddressLine1: values.billingAddressLine1,
    billingAddressLine2: values.billingAddressLine2 ?? "",
    billingTown: values.billingTown,
    billingCounty: values.billingCounty ?? "",
    billingPostcode: values.billingPostcode,

    // delivery address
    deliverySameAsBilling: values.deliverySameAsBilling,
    deliveryAddressLine1: values.deliverySameAsBilling
      ? values.billingAddressLine1
      : (values.deliveryAddressLine1 ?? ""),
    deliveryAddressLine2: values.deliverySameAsBilling
      ? (values.billingAddressLine2 ?? "")
      : (values.deliveryAddressLine2 ?? ""),
    deliveryTown: values.deliverySameAsBilling
      ? values.billingTown
      : (values.deliveryTown ?? ""),
    deliveryCounty: values.deliverySameAsBilling
      ? (values.billingCounty ?? "")
      : (values.deliveryCounty ?? ""),
    deliveryPostcode: values.deliverySameAsBilling
      ? values.billingPostcode
      : (values.deliveryPostcode ?? ""),

    notes: "", // hook this up when you add notes to the form
    payment_status: "waiting_first_deposit",
    orderStatus: "draft" as const,

    frameOrderId: frameItems.map((fi) => fi.id),
    paperweightOrderId: paperweightItem ? paperweightItem.id : undefined,
  };

  const order = await pb
    .collection(COLLECTIONS.ORDERS)
    .create<OrdersResponse>(orderPayload);

  // --- 4. Create the customer, linking to this order -----------------------

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

  // --- 5. Re-fetch order with expand so UI gets full structure -------------

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
