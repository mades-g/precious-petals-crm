import type {
  CustomersTitleOptions,
  CustomersHowRecommendedOptions,
  OrderFrameItemsFrameTypeOptions,
  OrderFrameItemsLayoutOptions,
  OrderFrameItemsGlassTypeOptions,
  OrderFrameItemsInclusionsOptions,
  OrderFrameItemsPreservationTypeOptions,
  OrdersPaymentStatusOptions,
  OrdersOrderStatusOptions,
  Collections,
  OrderFrameItemsFrameMountColourOptions,
} from "@/services/pb/types";

export const COLLECTIONS: Record<
  | "USERS"
  | "CUSTOMERS"
  | "ORDERS"
  | "ORDER_PAYMENTS"
  | "ORDER_PAPERWEIGHT_ITEMS"
  | "ORDER_FRAME_ITEMS"
  | "SMS_LOGS",
  Extract<
    Collections,
    | "customers"
    | "order_payments"
    | "orders"
    | "sms_logs"
    | "users"
    | "order_frame_items"
    | "order_paperweight_items"
  >
> = {
  USERS: "users",
  CUSTOMERS: "customers",
  ORDERS: "orders",
  ORDER_PAYMENTS: "order_payments",
  ORDER_FRAME_ITEMS: "order_frame_items",
  ORDER_PAPERWEIGHT_ITEMS: "order_paperweight_items",
  SMS_LOGS: "sms_logs",
};

export const CUSTOMERS_TITLE_OPTIONS: CustomersTitleOptions[] = [
  "Mrs",
  "Mr",
  "Miss",
] as const;

export const CUSTOMERS_HOW_RECOMMENDED_OPTIONS: CustomersHowRecommendedOptions[] =
  ["Google", "Friend / Family", "Florist", "Wedding planner"];

export const FRAME_MOUNT_COLOUR_OPTIONS: OrderFrameItemsFrameMountColourOptions[] =
  [
    "No Second Mount",
    "Cream",
    "Red",
    "Burgundy",
    "Gold",
    "Sage",
    "Silver",
    "Blue",
    "Purple",
    "Navy",
    "Pink",
    "Maroon",
    "Light Grey",
    "Bright white",
    "Artist design",
  ];

// to add Special frame see notes

// notes
// to take off
// speckled gold.  speckled silver brushed silver
export const FRAME_TYPE_OPTIONS: OrderFrameItemsFrameTypeOptions[] = [
  "Black",
  "Dark wood gold line",
  "Oak",
  "Beech",
  "Cottage pine",
  "Bronze",
  "Antique gold",
  "Speckled gold",
  "Antique silver",
  "Speckled silver",
  "New modern silver",
  "Distressed white",
  "Modern white",
  "Distressed white wide",
  "Pewter",
  "New pewter gunmetal",
  "Flat white",
  "Brushed silver",
  "Stone gold",
  "Stone silver",
];

export const FRAME_LAYOUT_OPTIONS: OrderFrameItemsLayoutOptions[] = [
  "Hand tied birds eye",
  "Hand tied side profile",
  "Hand tied side profile diagonal",
  "Straight on shower or teardrop",
  "Meadow",
  "Blanket",
  "Other",
];

export const CLEARVIEW_GLASS_TYPE: OrderFrameItemsGlassTypeOptions =
  "Clearview uv glass";

export const DEFAULT_FRAME_GLASS_TYPE: OrderFrameItemsGlassTypeOptions =
  "Conservation glass";

export const FRAME_INCLUSIONS_OPTIONS: OrderFrameItemsInclusionsOptions[] = [
  "Yes",
  "No",
  "Buttonhole",
];

export const FRAME_PRESERVATION_TYPE_OPTIONS: OrderFrameItemsPreservationTypeOptions[] =
  ["3D", "Pressed"];

export const ORDER_PAYMENT_STATUS_OPTIONS: OrdersPaymentStatusOptions[] = [
  "waiting_first_deposit",
  "waiting_second_deposit",
  "waiting_final_balance",
  "first_deposit_paid",
  "second_deposit_paid",
  "final_balance_paid",
];

export const ORDER_STATUS_OPTIONS: OrdersOrderStatusOptions[] = [
  "draft",
  "to_choose",
  "chosen",
  "in_progress",
  "ready",
  "left_the_studio",
  "cancelled",
];
