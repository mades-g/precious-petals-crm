import type { NormalisedCustomer } from "@/api/get-customers";
import type {
  OrdersOrderStatusOptions,
  OrdersPaymentStatusOptions,
} from "@/services/pb/types";

export type OrderDetails = NonNullable<NormalisedCustomer["orderDetails"]>;
export type OrderFrame = OrderDetails["frameOrder"][number];
export type OrderPaperweight = OrderDetails["paperWeightOrder"];

export type OrderExtrasDraft = {
  replacementFlowers: boolean;
  replacementFlowersQty: number | null;
  replacementFlowersPrice: number | null;
  collectionQty: number | null;
  collectionPrice: number | null;
  deliveryQty: number | null;
  deliveryPrice: number | null;
  returnUnusedFlowers: boolean;
  returnUnusedFlowersPrice: number | null;
  artistHours: number | null;
  notes: string;
};

export type StatusControl<T extends string> = {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
};

export type LineItemKind = "frame" | "paperweight" | "extra";

export type LineItem = {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
  kind: LineItemKind;
  frame?: OrderFrame;
};

export type Totals = {
  subTotal: number;
  vatRate: number;
  vatTotal: number;
  grandTotal: number;
};

export type EmailActionEndpoint = "invoice" | "recommendation";

export type EmailActionConfig = {
  key: string;
  label: string;
  description: string;
  endpoint: EmailActionEndpoint;
  emailType: string;
  eventType: string;
  templateKey?: string;
  requiresNote?: boolean;
  noteLabel?: string;
};

export type EmailActionStatus = {
  actionKey: string;
  state: "idle" | "sending" | "success" | "error";
  message?: string;
};

export type EmailContext = {
  emailType: string;
  eventType: string;
  templateKey?: string;
  eventNote?: string;
  orderId?: string;
  customerId?: string;
  frameItemId?: string;
  paperweightItemId?: string;
  meta?: Record<string, unknown>;
};

export type EmailLogEntry = {
  id: string;
  status?: "attempted" | "sent" | "failed" | string;
  emailType?: string;
  eventType?: string;
  subject?: string;
  sentAt?: string;
  error?: string;
  sentBy?: string;
};

export const EMAIL_ACTIONS: EmailActionConfig[] = [
  {
    key: "invoice",
    label: "Send invoice",
    description: "Email the latest invoice PDF to the customer.",
    endpoint: "invoice",
    emailType: "invoice",
    eventType: "invoice",
    templateKey: "email.invoice",
  },
  {
    key: "recommendation",
    label: "Send recommendation",
    description: "Send the bouquet recommendation email.",
    endpoint: "recommendation",
    emailType: "recommendation_bouquet",
    eventType: "bouquet_recommendation",
    templateKey: "email.recommendation",
  },
];

export type OrderStatusDraft = OrdersOrderStatusOptions;
export type PaymentStatusDraft = OrdersPaymentStatusOptions;
