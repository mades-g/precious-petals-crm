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
  | "ORDER_PAPERWEIGHT_ITEMS"
  | "ORDER_FRAME_ITMES",
  Extract<
    Collections,
    | "customers"
    | "orders"
    | "users"
    | "order_frame_items"
    | "order_paperweight_items"
  >
> = {
  USERS: "users",
  CUSTOMERS: "customers",
  ORDERS: "orders",
  ORDER_FRAME_ITMES: "order_frame_items",
  ORDER_PAPERWEIGHT_ITEMS: "order_paperweight_items",
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
    "Cream - 8674",
    "Red - 8020",
    "Burgundy - 8151",
    "Gold - 8246",
    "Sage - 8633",
    "Silver - 835",
    "Blue - 8168",
    "Purple - 8146",
    "Navy - 8687",
    "Pink - 8064",
    "Maroon - 8016",
    "Light Grey - 8664",
    "Bright white - 897",
  ];

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
  "Hand tied birds eve",
  "Hand tied side profile",
  "Hand tied side profile diagonal",
  "Straight on shower or teardrop",
  "Meadow",
];

export const FRAME_GLASS_TYPE_OPTIONS: OrderFrameItemsGlassTypeOptions[] = [
  "Clearview uv glass",
  "Conservation glass",
];

export const FRAME_INCLUSIONS_OPTIONS: OrderFrameItemsInclusionsOptions[] = [
  "Yes",
  "No",
  "Buttonhole",
];

export const FRAME_PRESERVATION_TYPE_OPTIONS: OrderFrameItemsPreservationTypeOptions[] =
  ["3D", "pressed"];

export const ORDER_PAYMENT_STATUS_OPTIONS: OrdersPaymentStatusOptions[] = [
  "wainting_first_deposit",
  "waiting_second_deposit",
  "waiting_final_balance",
  "first_deposit_paid",
  "second_deposit_paid",
  "final_balance_paid",
];

export const ORDER_STATUS_OPTIONS: OrdersOrderStatusOptions[] = [
  "in_progress",
  "ready",
  "delivered",
  "cancelled",
  "draft",
];
