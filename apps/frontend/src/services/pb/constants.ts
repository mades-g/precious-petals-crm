import type {
  CostumersTitleOptions,
  CostumersHowRecommendedOptions,
  OrderFrameItemsFrameColourOptions,
  OrderFrameItemsLayoutOptions,
  OrderFrameItemsGlassTypeOptions,
  OrderFrameItemsInclusionsOptions,
  OrderFrameItemsPreservationTypeOptions,
  OrdersPaymentStatusOptions,
  OrdersOrderStatusOptions,
  Collections,
} from "@/services/pb/types"

// ─────────────────────────────────────────────
// Collections (what is needed)
// ─────────────────────────────────────────────

export const COLLECTIONS: Record<"USERS" | "COSTUMERS" | "ORDERS", Extract<Collections, "costumers" | "orders" | "users">> = {
    USERS: 'users',
    COSTUMERS: 'costumers',
    ORDERS: 'orders',
}

// ─────────────────────────────────────────────
// Costumers
// ─────────────────────────────────────────────
export const COSTUMERS_TITLE_OPTIONS: CostumersTitleOptions[] = ["Mrs", "Mr", "Miss"]

export const COSTUMERS_HOW_RECOMMENDED_OPTIONS: CostumersHowRecommendedOptions[] = [
  "Google",
  "Friend / Family",
  "Florist",
  "Wedding planner",
]

// ─────────────────────────────────────────────
// Frames
// ─────────────────────────────────────────────
export const FRAME_COLOUR_OPTIONS: OrderFrameItemsFrameColourOptions[] = [
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
]

export const FRAME_LAYOUT_OPTIONS: OrderFrameItemsLayoutOptions[] = [
  "Hand tied birds eve",
  "Hand tied side profile",
  "Hand tied side profile diagonal",
  "Straight on shower or teardrop",
  "Meadow",
]

export const FRAME_GLASS_TYPE_OPTIONS: OrderFrameItemsGlassTypeOptions[] = [
  "Clearview uv glass",
  "Conservation glass",
]

export const FRAME_INCLUSIONS_OPTIONS: OrderFrameItemsInclusionsOptions[] = [
  "Yes",
  "No",
  "Buttonhole",
]

export const FRAME_PRESERVATION_TYPE_OPTIONS: OrderFrameItemsPreservationTypeOptions[] = [
  "3D",
  "pressed",
]

// ─────────────────────────────────────────────
// Orders
// ─────────────────────────────────────────────
export const ORDER_PAYMENT_STATUS_OPTIONS: OrdersPaymentStatusOptions[] = [
  "wainting_first_deposit",
  "waiting_second_deposit",
  "waiting_final_balance",
  "first_deposit_paid",
  "second_deposit_paid",
  "final_balance_paid",
]

export const ORDER_STATUS_OPTIONS: OrdersOrderStatusOptions[] = [
  "in_progress",
  "ready",
  "delivered",
  "cancelled",
  "draft",
]
