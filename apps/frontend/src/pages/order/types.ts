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
  replacementFlowersPrice: number | null;
  collection: boolean;
  collectionPrice: number | null;
  delivery: boolean;
  deliveryPrice: number | null;
  recreateButtonhole: boolean;
  recreateButtonholePrice: number | null;
  returnUnusedFlowers: boolean;
  returnUnusedFlowersPrice: number | null;
  notes: string;
};

export type FrameGlassDraft = {
  frameId: string;
  label: string;
  clearviewEnabled: boolean;
  price: number | null;
};

export type StatusControl<T extends string> = {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
  disabled?: boolean;
  isOptionDisabled?: (option: T) => boolean;
  helperText?: string;
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
  paidTotal?: number;
  balanceDue?: number;
};

export type EmailActionEndpoint =
  | "invoice"
  | "recommendation"
  | "delivery_collect";

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
  toEmail?: string;
  toName?: string;
  eventNote?: string;
  templateKey?: string;
  meta?: Record<string, unknown> | null;
  expand?: {
    sentBy?: {
      id?: string;
      email?: string;
      name?: string;
    };
  };
};

export type RecommendationReminderStatus =
  | "not_eligible"
  | "not_started"
  | "scheduled"
  | "due_today"
  | "overdue"
  | "stopped";

export type RecommendationReminderSummary = {
  status: RecommendationReminderStatus;
  automatedReminderCount: number;
  successfulRecommendationCount: number;
  firstRecommendationSentAt?: string;
  lastReminderSentAt?: string;
  lastFailedReminderAt?: string;
  nextReminderDueDate?: string;
  daysUntilNextReminder?: number;
  daysOverdue?: number;
  blockedReason?: string;
  hasFailedReminderAfterLastSuccess: boolean;
};

export const EMAIL_ACTIONS: EmailActionConfig[] = [
  {
    key: "recommendation",
    label: "Send recommendation",
    description: "Send recommendations to customer.",
    endpoint: "recommendation",
    emailType: "recommendation_bouquet",
    eventType: "bouquet_recommendation",
    templateKey: "email.recommendation",
  },
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
    key: "delivery_collect",
    label: "Send ready for collection/delivery",
    description: "Notify the customer their order is ready.",
    endpoint: "delivery_collect",
    emailType: "delivery_collect",
    eventType: "delivery_collect",
    templateKey: "email.delivery_collect",
  },
];

export type OrderStatusDraft = OrdersOrderStatusOptions;
export type PaymentStatusDraft = OrdersPaymentStatusOptions;
