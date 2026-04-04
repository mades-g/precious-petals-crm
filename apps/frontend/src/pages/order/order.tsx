import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, Text } from "@radix-ui/themes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";

import { updateBouquet } from "@/api/update-bouquet";
import { useAuth } from "@/auth/hooks/use-auth";
import { pb } from "@/services/pb/client";
import {
  CLEARVIEW_GLASS_TYPE,
  COLLECTIONS,
  DEFAULT_FRAME_GLASS_TYPE,
} from "@/services/pb/constants";
import type {
  OrdersOrderStatusOptions,
  OrdersPaymentStatusOptions,
  Update,
} from "@/services/pb/types";
import { buildCustomerFormDefaults } from "@/pages/home/components/create-new-order-modal/create-new-order-modal.utils";
import CreateNewOrderModal, {
  type FormStage,
} from "@/pages/home/components/create-new-order-modal/create-new-order-modal";
import type { ModalMode } from "@/pages/home/home";

import OrderHeader from "./components/OrderHeader";
import OrderActionsBar from "./components/OrderActionsBar";
import OrderItemsTable from "./components/OrderItemsTable";
import OrderExtrasAccordion from "./components/OrderExtrasAccordion";
import OrderPaymentsCard from "./components/OrderPaymentsCard";
import EmailActionsDrawer from "./components/EmailActionsDrawer";
import SmsLogDrawer from "./components/SmsLogDrawer";
import SendSmsDialog from "./components/SendSmsDialog";
import { useOrderQuery } from "./hooks/useOrderQuery";
import { useOrderExtrasMutations } from "./hooks/useOrderExtrasMutations";
import { useOrderCompletionMutations } from "./hooks/useOrderCompletionMutations";
import { usePaperweightMutations } from "./hooks/usePaperweightMutations";
import { useOrderDeleteMutation } from "./hooks/useOrderDeleteMutation";
import {
  useOrderPayments,
  useOrderPaymentsMutations,
} from "./hooks/useOrderPayments";
import { useEmailActions } from "./hooks/useEmailActions";
import { useEmailLogsQuery } from "./hooks/useEmailLogsQuery";
import { formatCurrency } from "@/utils";
import { buildLineItems } from "./utils/buildLineItems";
import { buildTotals } from "./utils/buildTotals";
import { buildExtrasSummary } from "./utils/buildExtrasSummary";
import { buildEmailPayload } from "./utils/buildEmailPayload";
import {
  EMAIL_ACTIONS,
  type FrameGlassDraft,
  type OrderExtrasDraft,
  type OrderFrame,
} from "./types";
import { sendSms, type SmsType } from "@/api/send-sms";
import type { FrameExtras } from "@/api/types";

const defaultExtrasDraft: OrderExtrasDraft = {
  replacementFlowers: false,
  replacementFlowersQty: null,
  replacementFlowersPrice: null,
  collectionQty: null,
  collectionPrice: null,
  deliveryQty: null,
  deliveryPrice: null,
  recreateButtonholeQty: null,
  recreateButtonholePrice: null,
  returnUnusedFlowers: false,
  returnUnusedFlowersPrice: null,
  notes: "",
};

const PAYMENT_STATUS_SEQUENCE: OrdersPaymentStatusOptions[] = [
  "waiting_first_deposit",
  "first_deposit_paid",
  "waiting_second_deposit",
  "second_deposit_paid",
  "waiting_final_balance",
  "final_balance_paid",
];

const normalizeLoadedPrice = (value?: number | null) =>
  value == null ? null : value;

const normalizeLoadedQty = (value?: number | null) =>
  value == null || value <= 0 ? null : value;

const buildFrameGlassDrafts = (frames: OrderFrame[]): FrameGlassDraft[] =>
  frames.map((frame, index) => ({
    frameId: frame.frameId ?? `frame-${index}`,
    label: `Bouquet #${index + 1}`,
    clearviewEnabled: frame.glassType === CLEARVIEW_GLASS_TYPE,
    price: frame.extras?.glassPrice ?? null,
  }));

const OrderPage = () => {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: customer,
    isLoading: isLoadingCustomer,
    isError: isCustomerError,
  } = useOrderQuery(orderId);

  const order = customer?.orderDetails;
  const frames = useMemo(() => order?.frameOrder ?? [], [order?.frameOrder]);
  const paperweight = order?.paperWeightOrder ?? null;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentFormStage, setCurrentFormStage] =
    useState<FormStage>("bouquet_data");
  const [selectedBouquetId, setSelectedBouquetId] = useState<string | null>(
    null,
  );
  const [isEmailDrawerOpen, setIsEmailDrawerOpen] = useState(false);
  const [isSmsOpen, setIsSmsOpen] = useState(false);
  const [smsLogsOpen, setSmsLogsOpen] = useState(false);

  const [orderStatusDraft, setOrderStatusDraft] =
    useState<OrdersOrderStatusOptions>("draft");
  const [paymentStatusDraft, setPaymentStatusDraft] =
    useState<OrdersPaymentStatusOptions>("waiting_first_deposit");
  const [paperweightReceivedDraft, setPaperweightReceivedDraft] =
    useState(false);
  const [artworkCompleteDraft, setArtworkCompleteDraft] = useState(false);
  const [framingCompleteDraft, setFramingCompleteDraft] = useState(false);
  const [orderExtrasDraft, setOrderExtrasDraft] =
    useState<OrderExtrasDraft>(defaultExtrasDraft);
  const [frameGlassDrafts, setFrameGlassDrafts] = useState<FrameGlassDraft[]>(
    [],
  );
  const [orderExtrasError, setOrderExtrasError] = useState<string | null>(null);
  const [isSavingFrameGlassDrafts, setIsSavingFrameGlassDrafts] =
    useState(false);

  const modalMode: ModalMode = "edit";
  const currentCustomerForm = useMemo(() => {
    if (!customer) return null;
    return buildCustomerFormDefaults(customer);
  }, [customer]);

  useEffect(() => {
    if (!order) return;

    setOrderStatusDraft(order.orderStatus ?? "draft");
    setPaymentStatusDraft(order.paymentStatus ?? "waiting_first_deposit");
    setPaperweightReceivedDraft(
      Boolean(order.paperWeightOrder?.paperweightReceived),
    );
    setArtworkCompleteDraft(Boolean(order.artworkComplete));
    setFramingCompleteDraft(Boolean(order.framingComplete));
    const replacementFlowersEnabled = Boolean(order.replacementFlowers);
    const collectionQty = normalizeLoadedQty(order.collectionQty);
    const deliveryQty = normalizeLoadedQty(order.deliveryQty);
    const recreateButtonholeQty = normalizeLoadedQty(
      order.recreateButtonholeQty,
    );
    const returnUnusedFlowersEnabled = Boolean(order.returnUnusedFlowers);

    setOrderExtrasDraft({
      replacementFlowers: replacementFlowersEnabled,
      replacementFlowersQty: replacementFlowersEnabled
        ? normalizeLoadedQty(order.replacementFlowersQty) ?? 1
        : null,
      replacementFlowersPrice: replacementFlowersEnabled
        ? normalizeLoadedPrice(order.replacementFlowersPrice)
        : null,
      collectionQty,
      collectionPrice:
        collectionQty != null ? normalizeLoadedPrice(order.collectionPrice) : null,
      deliveryQty,
      deliveryPrice:
        deliveryQty != null ? normalizeLoadedPrice(order.deliveryPrice) : null,
      recreateButtonholeQty,
      recreateButtonholePrice:
        recreateButtonholeQty != null
          ? normalizeLoadedPrice(order.recreateButtonholePrice)
          : null,
      returnUnusedFlowers: returnUnusedFlowersEnabled,
      returnUnusedFlowersPrice: returnUnusedFlowersEnabled
        ? normalizeLoadedPrice(order.returnUnusedFlowersPrice)
        : null,
      notes: order.notes ?? "",
    });
    setFrameGlassDrafts(buildFrameGlassDrafts(order.frameOrder ?? []));
    setOrderExtrasError(null);
  }, [order]);

  const framesForDisplay = useMemo(
    () =>
      frames.map((frame, index) => {
        const draftId = frame.frameId ?? `frame-${index}`;
        const draft = frameGlassDrafts.find((item) => item.frameId === draftId);

        if (!draft) return frame;

        const nextExtras: FrameExtras = {
          measuredWidthIn: frame.extras?.measuredWidthIn ?? null,
          measuredHeightIn: frame.extras?.measuredHeightIn ?? null,
          recommendedSizeWidthIn: frame.extras?.recommendedSizeWidthIn ?? null,
          recommendedSizeHeightIn: frame.extras?.recommendedSizeHeightIn ?? null,
          framePrice: frame.extras?.framePrice ?? null,
          mountPrice: frame.extras?.mountPrice ?? null,
          glassPrice: draft.clearviewEnabled ? draft.price : null,
          glassEngravingPrice: frame.extras?.glassEngravingPrice ?? null,
        };

        return {
          ...frame,
          glassType: draft.clearviewEnabled
            ? CLEARVIEW_GLASS_TYPE
            : DEFAULT_FRAME_GLASS_TYPE,
          extras: nextExtras,
        };
      }),
    [frameGlassDrafts, frames],
  );

  const lineItems = useMemo(
    () => buildLineItems(framesForDisplay, paperweight),
    [framesForDisplay, paperweight],
  );
  const totals = useMemo(
    () => buildTotals(lineItems, orderExtrasDraft),
    [lineItems, orderExtrasDraft],
  );
  const orderExtrasSummary = useMemo(
    () => buildExtrasSummary(orderExtrasDraft, frameGlassDrafts),
    [frameGlassDrafts, orderExtrasDraft],
  );

  const { deleteOrder, isDeleting } = useOrderDeleteMutation(order?.orderId);
  const { saveExtras, isSavingExtras } = useOrderExtrasMutations(
    order?.orderId,
  );
  const { updateOrderCompletion, isSavingCompletion } =
    useOrderCompletionMutations(order?.orderId);
  const { updatePaperweight, isSavingPaperweight } = usePaperweightMutations(
    order?.orderId,
  );
  const {
    data: payments,
    isLoading: isLoadingPayments,
    isError: isPaymentsError,
  } = useOrderPayments(order?.orderId);
  const { addPayment, updatePayment, isSavingPayment, isUpdatingPayment } =
    useOrderPaymentsMutations(order?.orderId);

  const totalPaid = useMemo(
    () => (payments ?? []).reduce((sum, payment) => sum + payment.amount, 0),
    [payments],
  );
  const outstandingBalance = useMemo(
    () => Math.max(0, totals.grandTotal - totalPaid),
    [totals.grandTotal, totalPaid],
  );
  const invoiceTotals = useMemo(
    () => ({
      ...totals,
      paidTotal: totalPaid,
      balanceDue: outstandingBalance,
    }),
    [totals, totalPaid, outstandingBalance],
  );
  const isCancelled = orderStatusDraft === "cancelled";
  const canDeleteOrder = isAdmin && orderStatusDraft === "cancelled";

  const { mutateAsync: updateStatus, isPending: isUpdatingStatus } =
    useMutation({
      mutationFn: async (nextStatus: OrdersOrderStatusOptions) => {
        if (!order?.orderId) {
          throw new Error("Missing order ID");
        }
        const payload: Update<"orders"> = {
          orderStatus: nextStatus,
        };
        return pb.collection(COLLECTIONS.ORDERS).update(order.orderId, payload);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        if (order?.orderId) {
          queryClient.invalidateQueries({
            queryKey: ["sms_logs", order.orderId],
          });
        }
        if (order?.orderId) {
          queryClient.invalidateQueries({
            queryKey: ["customer", order.orderId],
          });
        }
      },
    });

  const handleUpdateStatus = useCallback(
    async (nextStatus: OrdersOrderStatusOptions) => {
      await updateStatus(nextStatus);
      setOrderStatusDraft(nextStatus);
    },
    [updateStatus],
  );

  const getCompletionDrivenStatus = (
    currentStatus: OrdersOrderStatusOptions,
    nextCompletionEligible: boolean,
    nextChosenEligible: boolean,
  ): OrdersOrderStatusOptions | null => {
    if (currentStatus === "cancelled" || currentStatus === "left_the_studio") {
      return null;
    }

    if (nextChosenEligible && nextCompletionEligible) {
      return currentStatus === "ready" ? null : "ready";
    }

    if (currentStatus === "ready" && !nextCompletionEligible) {
      return nextChosenEligible ? "in_progress" : "chosen";
    }

    return null;
  };

  const syncCompletionDrivenStatus = async (nextValues: {
    artworkComplete?: boolean;
    framingComplete?: boolean;
    paperweightReceived?: boolean;
  }) => {
    const nextArtworkComplete =
      nextValues.artworkComplete ?? artworkCompleteDraft;
    const nextFramingComplete =
      nextValues.framingComplete ?? framingCompleteDraft;
    const nextPaperweightReceived =
      nextValues.paperweightReceived ?? paperweightReceivedDraft;

    const nextFramesComplete =
      !hasFrames || (nextArtworkComplete && nextFramingComplete);
    const nextPaperweightComplete =
      !hasPaperweight || nextPaperweightReceived;
    const nextCompletionEligible =
      nextFramesComplete && nextPaperweightComplete;
    const nextStatus = getCompletionDrivenStatus(
      orderStatusDraft,
      nextCompletionEligible,
      chosenEligible,
    );

    if (nextStatus && nextStatus !== orderStatusDraft) {
      await handleUpdateStatus(nextStatus);
    }
  };

  const hasPaperweight = Boolean(paperweight?.paperWeightId);
  const hasFrames = frames.length > 0;
  const framesComplete = useMemo(
    () => !hasFrames || (artworkCompleteDraft && framingCompleteDraft),
    [hasFrames, artworkCompleteDraft, framingCompleteDraft],
  );
  const paperweightComplete = useMemo(
    () => !hasPaperweight || paperweightReceivedDraft,
    [hasPaperweight, paperweightReceivedDraft],
  );
  const completionEligible = framesComplete && paperweightComplete;
  const paymentIndex = PAYMENT_STATUS_SEQUENCE.indexOf(paymentStatusDraft);
  const secondPaidIndex = PAYMENT_STATUS_SEQUENCE.indexOf("second_deposit_paid");
  const chosenEligible = paymentIndex >= secondPaidIndex;
  const leftStudioEligible =
    completionEligible &&
    paymentStatusDraft === "final_balance_paid" &&
    outstandingBalance === 0;
  const canSendInvoice = chosenEligible;

  useEffect(() => {
    if (!order?.orderId || isUpdatingStatus) return;

    const nextStatus = getCompletionDrivenStatus(
      orderStatusDraft,
      completionEligible,
      chosenEligible,
    );

    if (!nextStatus || nextStatus === orderStatusDraft) return;

    void handleUpdateStatus(nextStatus);
  }, [
    chosenEligible,
    completionEligible,
    handleUpdateStatus,
    isUpdatingStatus,
    order?.orderId,
    orderStatusDraft,
  ]);

  const allowedOrderStatuses: Record<
    OrdersOrderStatusOptions,
    OrdersOrderStatusOptions[]
  > = {
    draft: ["draft", "to_choose", "cancelled"],
    to_choose: ["draft", "to_choose", "chosen", "cancelled"],
    chosen: ["draft", "to_choose", "chosen", "in_progress", "cancelled"],
    in_progress: [
      "draft",
      "to_choose",
      "chosen",
      "in_progress",
      "ready",
      "cancelled",
    ],
    ready: [
      "draft",
      "to_choose",
      "chosen",
      "in_progress",
      "ready",
      "left_the_studio",
      "cancelled",
    ],
    cancelled: ["cancelled"],
    left_the_studio: ["left_the_studio"],
  };

  const isOrderStatusDisabled = (status: OrdersOrderStatusOptions) => {
    if (!allowedOrderStatuses[orderStatusDraft].includes(status)) return true;
    if (status === "chosen") return !chosenEligible;
    if (status === "in_progress") return !chosenEligible;
    if (status === "ready") return !completionEligible;
    if (status === "left_the_studio") {
      return !leftStudioEligible;
    }
    return false;
  };

  let statusHelperText = "";
  if (!chosenEligible) {
    statusHelperText = "Chosen and In progress require second deposit paid.";
  } else if (
    (orderStatusDraft === "in_progress" || orderStatusDraft === "ready") &&
    !completionEligible
  ) {
    statusHelperText =
      "Ready requires artwork & framing complete (if frames exist) and paperweight received.";
  } else if (orderStatusDraft === "ready" && !leftStudioEligible) {
    statusHelperText =
      "Left the studio requires final balance paid and outstanding balance £0.";
  }

  const { canSendEmails, sendEmail, emailStatus } = useEmailActions({
    customer,
    order,
    currentOrderStatus: orderStatusDraft,
    frames: framesForDisplay,
    paperweight,
    extras: orderExtrasDraft,
    totals: invoiceTotals,
  });
  const canSendOrderEmails = canSendEmails && orderStatusDraft !== "cancelled";

  const {
    data: emailLogs,
    isLoading: isLoadingLogs,
    isError: isLogsError,
  } = useEmailLogsQuery(order?.orderId);

  const handleSaveExtras = async () => {
    if (!order?.orderId) return;

    const replacementFlowersEnabled = orderExtrasDraft.replacementFlowers;
    const collectionEnabled =
      typeof orderExtrasDraft.collectionQty === "number" &&
      orderExtrasDraft.collectionQty > 0;
    const deliveryEnabled =
      typeof orderExtrasDraft.deliveryQty === "number" &&
      orderExtrasDraft.deliveryQty > 0;
    const recreateButtonholeEnabled =
      typeof orderExtrasDraft.recreateButtonholeQty === "number" &&
      orderExtrasDraft.recreateButtonholeQty > 0;
    const returnUnusedFlowersEnabled = orderExtrasDraft.returnUnusedFlowers;

    const invalidGlassDraft = frameGlassDrafts.find(
      (draft) => draft.clearviewEnabled && draft.price == null,
    );
    if (invalidGlassDraft) {
      setOrderExtrasError(
        `${invalidGlassDraft.label}: enter a price for Clearview UV glass before saving.`,
      );
      return;
    }

    setOrderExtrasError(null);
    setIsSavingFrameGlassDrafts(true);

    const payload: Update<"orders"> = {
      notes: orderExtrasDraft.notes ?? "",
      replacementFlowers: replacementFlowersEnabled,
      replacementFlowersQty: replacementFlowersEnabled
        ? (orderExtrasDraft.replacementFlowersQty ?? 1)
        : 0,
      replacementFlowersPrice: replacementFlowersEnabled
        ? (orderExtrasDraft.replacementFlowersPrice ?? 0)
        : 0,
      collectionQty: collectionEnabled ? (orderExtrasDraft.collectionQty ?? 1) : 0,
      collectionPrice: collectionEnabled
        ? (orderExtrasDraft.collectionPrice ?? 0)
        : 0,
      deliveryQty: deliveryEnabled ? (orderExtrasDraft.deliveryQty ?? 1) : 0,
      deliveryPrice: deliveryEnabled ? (orderExtrasDraft.deliveryPrice ?? 0) : 0,
      recreateButtonholeQty: recreateButtonholeEnabled
        ? (orderExtrasDraft.recreateButtonholeQty ?? 1)
        : 0,
      recreateButtonholePrice: recreateButtonholeEnabled
        ? (orderExtrasDraft.recreateButtonholePrice ?? 0)
        : 0,
      returnUnusedFlowers: returnUnusedFlowersEnabled,
      returnUnusedFlowersPrice: returnUnusedFlowersEnabled
        ? (orderExtrasDraft.returnUnusedFlowersPrice ?? 0)
        : 0,
    };

    try {
      const frameUpdates = frames.flatMap((frame, index) => {
        const frameId = frame.frameId;
        const draft = frameGlassDrafts.find(
          (item) => item.frameId === (frame.frameId ?? `frame-${index}`),
        );

        if (!frameId || !draft) return [];

        const currentGlassType = frame.glassType ?? DEFAULT_FRAME_GLASS_TYPE;
        const nextGlassType = draft.clearviewEnabled
          ? CLEARVIEW_GLASS_TYPE
          : DEFAULT_FRAME_GLASS_TYPE;
        const currentGlassPrice = frame.extras?.glassPrice ?? null;
        const nextGlassPrice = draft.clearviewEnabled ? draft.price : null;

        if (
          currentGlassType === nextGlassType &&
          currentGlassPrice === nextGlassPrice
        ) {
          return [];
        }

        const extras: FrameExtras = {
          measuredWidthIn: frame.extras?.measuredWidthIn ?? null,
          measuredHeightIn: frame.extras?.measuredHeightIn ?? null,
          recommendedSizeWidthIn: frame.extras?.recommendedSizeWidthIn ?? null,
          recommendedSizeHeightIn: frame.extras?.recommendedSizeHeightIn ?? null,
          framePrice: frame.extras?.framePrice ?? null,
          mountPrice: frame.extras?.mountPrice ?? null,
          glassPrice: nextGlassPrice,
          glassEngravingPrice: frame.extras?.glassEngravingPrice ?? null,
        };

        return [
          updateBouquet({
            frameId,
            glassType: nextGlassType,
            extras,
          }),
        ];
      });

      if (frameUpdates.length > 0) {
        await Promise.all(frameUpdates);
      }

      await saveExtras(payload);
    } catch (error) {
      setOrderExtrasError(
        error instanceof Error ? error.message : "Failed to save order extras.",
      );
    } finally {
      setIsSavingFrameGlassDrafts(false);
    }
  };

  const handleUpdateExtrasField = (
    key: keyof OrderExtrasDraft,
    value: OrderExtrasDraft[keyof OrderExtrasDraft],
  ) => {
    setOrderExtrasError(null);
    setOrderExtrasDraft((prev) => {
      if (key === "replacementFlowers" && value === false) {
        return {
          ...prev,
          replacementFlowers: false,
          replacementFlowersQty: null,
          replacementFlowersPrice: null,
        };
      }
      if (key === "replacementFlowersQty" && value == null) {
        return {
          ...prev,
          replacementFlowersQty: null,
          replacementFlowersPrice: null,
        };
      }
      if (key === "collectionQty" && value == null) {
        return {
          ...prev,
          collectionQty: null,
          collectionPrice: null,
        };
      }
      if (key === "deliveryQty" && value == null) {
        return {
          ...prev,
          deliveryQty: null,
          deliveryPrice: null,
        };
      }
      if (key === "recreateButtonholeQty" && value == null) {
        return {
          ...prev,
          recreateButtonholeQty: null,
          recreateButtonholePrice: null,
        };
      }
      if (key === "returnUnusedFlowers" && value === false) {
        return {
          ...prev,
          returnUnusedFlowers: false,
          returnUnusedFlowersPrice: null,
        };
      }
      return { ...prev, [key]: value };
    });
  };

  const handleUpdateFrameGlass = (
    frameId: string,
    changes: Partial<Pick<FrameGlassDraft, "clearviewEnabled" | "price">>,
  ) => {
    setOrderExtrasError(null);
    setFrameGlassDrafts((prev) =>
      prev.map((draft) =>
        draft.frameId === frameId ? { ...draft, ...changes } : draft,
      ),
    );
  };

  const handleTogglePaperweightReceived = async (next: boolean) => {
    if (!paperweight?.paperWeightId) return;

    setPaperweightReceivedDraft(next);

    try {
      await updatePaperweight({
        id: paperweight.paperWeightId,
        quantity: paperweight.quantity ?? 1,
        price: paperweight.price ?? 0,
        paperweightReceived: next,
      });
    } catch {
      setPaperweightReceivedDraft((prev) => !prev);
      return;
    }

    try {
      await syncCompletionDrivenStatus({ paperweightReceived: next });
    } catch {
      // Completion status is secondary to saving the checkbox itself.
    }
  };

  const handleToggleArtworkComplete = async (next: boolean) => {
    if (!order?.orderId) return;
    const previous = artworkCompleteDraft;
    setArtworkCompleteDraft(next);
    try {
      await updateOrderCompletion({
        orderId: order.orderId,
        artworkComplete: next,
      });
    } catch {
      setArtworkCompleteDraft(previous);
      return;
    }

    try {
      await syncCompletionDrivenStatus({ artworkComplete: next });
    } catch {
      // Completion status is secondary to saving the checkbox itself.
    }
  };

  const handleToggleFramingComplete = async (next: boolean) => {
    if (!order?.orderId) return;
    const previous = framingCompleteDraft;
    setFramingCompleteDraft(next);
    try {
      await updateOrderCompletion({
        orderId: order.orderId,
        framingComplete: next,
      });
    } catch {
      setFramingCompleteDraft(previous);
      return;
    }

    try {
      await syncCompletionDrivenStatus({ framingComplete: next });
    } catch {
      // Completion status is secondary to saving the checkbox itself.
    }
  };

  const openEditModal = (stage: FormStage, bouquetId?: string | null) => {
    setCurrentFormStage(stage);
    setSelectedBouquetId(bouquetId ?? null);
    setIsEditModalOpen(true);
  };

  const handlePreviewInvoice = () => {
    if (!order?.orderId) return;

    const payload = buildEmailPayload({
      customer,
      order,
      frames: framesForDisplay,
      paperweight,
      extras: orderExtrasDraft,
      totals: invoiceTotals,
    });

    navigate("/invoice-preview", {
      state: { payload },
    });
  };

  const handleDeleteOrder = async () => {
    if (!order?.orderId) return;

    const label = order.orderNo ?? order.orderId;
    const confirmed = window.confirm(`Delete order ${label}?`);
    if (!confirmed) return;

    await deleteOrder();
    navigate("/");
  };

  const { mutateAsync: sendSmsMessage, isPending: isSendingSms } = useMutation({
    mutationFn: (payload: {
      type: SmsType;
      message: string;
      sender?: string;
    }) => {
      if (!order?.orderId) {
        throw new Error("Missing order ID");
      }
      const balanceDue = formatCurrency(invoiceTotals.balanceDue ?? 0);
      const totalBalance = formatCurrency(invoiceTotals.grandTotal ?? 0);
      return sendSms({
        orderId: order.orderId,
        type: payload.type,
        message: payload.message,
        sender: payload.sender,
        balanceDue: balanceDue ?? undefined,
        totalBalance: totalBalance ?? undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (order?.orderId) {
        queryClient.invalidateQueries({
          queryKey: ["customer", order.orderId],
        });
      }
    },
  });

  const orderLabel = order?.orderNo ?? order?.orderId ?? "";

  if (!orderId) {
    return (
      <Box p="4">
        <Text size="2" color="gray">
          Missing order ID.
        </Text>
      </Box>
    );
  }

  if (isLoadingCustomer) {
    return (
      <Box p="4">
        <Text size="2" color="gray">
          Loading order...
        </Text>
      </Box>
    );
  }

  if (isCustomerError || !customer) {
    return (
      <Box p="4">
        <Text size="2" color="gray">
          We couldn't load this order.
        </Text>
        <Button variant="ghost" size="1" onClick={() => navigate("/")}>
          ← Customers
        </Button>
      </Box>
    );
  }

  return (
    <Box width="100%">
      <OrderHeader
        orderLabel={`${orderLabel}`}
        onBack={() => navigate(-1)}
        customerName={customer?.displayName ?? ""}
      />
      <OrderActionsBar
        created={order?.created}
        occasionDate={order?.occasionDate}
        requiredBy={order?.requiredBy}
        orderStatus={orderStatusDraft}
        paymentStatus={paymentStatusDraft}
        showCompletion={hasFrames || hasPaperweight}
        showFrameCompletion={hasFrames}
        showPaperweightCompletion={hasPaperweight}
        artworkComplete={artworkCompleteDraft}
        framingComplete={framingCompleteDraft}
        paperweightReceived={paperweightReceivedDraft}
        onToggleArtworkComplete={handleToggleArtworkComplete}
        onToggleFramingComplete={handleToggleFramingComplete}
        onTogglePaperweightReceived={handleTogglePaperweightReceived}
        isSavingCompletion={isSavingCompletion}
        isSavingPaperweight={isSavingPaperweight}
        onPreviewInvoice={handlePreviewInvoice}
        onOpenEmailActions={() => setIsEmailDrawerOpen(true)}
        onOpenSms={() => setIsSmsOpen(true)}
        onOpenSmsLogs={() => setSmsLogsOpen(true)}
        onUpdateStatus={handleUpdateStatus}
        isUpdatingStatus={isUpdatingStatus}
        isStatusDisabled={isOrderStatusDisabled}
        statusHelperText={statusHelperText}
        emailDisabled={orderStatusDraft === "cancelled"}
        smsDisabled={!customer?.phoneNumber}
        onDelete={handleDeleteOrder}
        isDeleting={isDeleting}
        showDelete={canDeleteOrder}
      />
      <Box mt="4">
        <OrderPaymentsCard
          payments={payments ?? []}
          isLoading={isLoadingPayments}
          isError={Boolean(isPaymentsError)}
          isSaving={isSavingPayment || isUpdatingPayment}
          outstanding={outstandingBalance}
          orderRequiredBy={order?.requiredBy}
          orderArtistHours={order?.artistHours ?? null}
          onCreate={(payload) =>
            addPayment({ ...payload, currentOrderStatus: orderStatusDraft })
          }
          onUpdate={(payload) =>
            updatePayment({
              ...payload,
              data: {
                ...payload.data,
                currentOrderStatus: orderStatusDraft,
              },
            })
          }
          disabled={orderStatusDraft === "cancelled"}
        />
      </Box>
      <Box mt="4">
        <OrderItemsTable
          lineItems={lineItems}
          paperweight={paperweight}
          onEditFrame={(frameId) => openEditModal("bouquet_data", frameId)}
          onEditPaperweight={() => openEditModal("paperweight_data")}
          isSavingPaperweight={isSavingPaperweight}
        />
      </Box>
      <Box mt="4">
        <OrderExtrasAccordion
          orderExtras={orderExtrasDraft}
          frameGlassDrafts={frameGlassDrafts}
          summary={orderExtrasSummary}
          onUpdateField={handleUpdateExtrasField}
          onUpdateFrameGlass={handleUpdateFrameGlass}
          onSave={handleSaveExtras}
          isSaving={isSavingExtras || isSavingFrameGlassDrafts}
          error={orderExtrasError}
        />
      </Box>
      <CreateNewOrderModal
        modalMode={modalMode}
        isModalOpen={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setSelectedBouquetId(null);
        }}
        setCurrentFormStage={setCurrentFormStage}
        currentFormStage={currentFormStage}
        currentCustomerForm={currentCustomerForm}
        selectedBouquetId={selectedBouquetId}
      />
      <EmailActionsDrawer
        open={isEmailDrawerOpen}
        onOpenChange={setIsEmailDrawerOpen}
        actions={EMAIL_ACTIONS}
        onSend={sendEmail}
        emailStatus={emailStatus}
        canSendEmails={canSendOrderEmails}
        isActionDisabled={(action) =>
          action.key === "invoice"
            ? !canSendInvoice
            : action.key === "delivery_collect"
              ? orderStatusDraft !== "ready"
              : false
        }
        actionDisabledMessage={(action) =>
          action.key === "invoice" && !canSendInvoice
            ? "Second deposit must be paid to send invoice."
            : action.key === "delivery_collect" &&
                orderStatusDraft !== "ready"
              ? "Order must be Ready to send this email."
              : null
        }
        disabledMessage={
          isCancelled ? "Emails are disabled for cancelled orders." : undefined
        }
        logs={emailLogs ?? []}
        isLoadingLogs={isLoadingLogs}
        isLogsError={Boolean(isLogsError)}
      />
      {order?.orderId && customer ? (
        <SendSmsDialog
          open={isSmsOpen}
          onOpenChange={(next) => setIsSmsOpen(next)}
          order={{ id: order.orderId, orderNo: order.orderNo }}
          customer={{
            fullName: customer.displayName,
            firstName: customer.firstName,
            phone: customer.phoneNumber,
          }}
          totals={{
            totalBalance: formatCurrency(invoiceTotals.grandTotal) ?? "",
            balanceDue: formatCurrency(invoiceTotals.balanceDue ?? 0) ?? "",
          }}
          onSend={(payload) => sendSmsMessage(payload)}
          isSending={isSendingSms}
        />
      ) : null}
      {order?.orderId ? (
        <SmsLogDrawer
          open={smsLogsOpen}
          onOpenChange={setSmsLogsOpen}
          order={{ id: order.orderId, orderNo: order.orderNo }}
        />
      ) : null}
    </Box>
  );
};

export default OrderPage;
