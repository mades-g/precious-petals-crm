import { useEffect, useMemo, useState } from "react";
import { Box, Button, Text } from "@radix-ui/themes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";

import { useAuth } from "@/auth/hooks/use-auth";
import { pb } from "@/services/pb/client";
import { COLLECTIONS } from "@/services/pb/constants";
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
import { useFrameMutations } from "./hooks/useFrameMutations";
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
import { EMAIL_ACTIONS, type OrderExtrasDraft, type OrderFrame } from "./types";
import { sendSms, type SmsType } from "@/api/send-sms";

const defaultExtrasDraft: OrderExtrasDraft = {
  replacementFlowers: false,
  replacementFlowersQty: null,
  replacementFlowersPrice: null,
  collectionQty: null,
  collectionPrice: null,
  deliveryQty: null,
  deliveryPrice: null,
  returnUnusedFlowers: false,
  returnUnusedFlowersPrice: null,
  artistHours: null,
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

const normalizeLoadedNumber = (value?: number | null) =>
  value == null || value === 0 ? null : value;

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
  const [orderExtrasOpen, setOrderExtrasOpen] = useState(false);

  const [orderStatusDraft, setOrderStatusDraft] =
    useState<OrdersOrderStatusOptions>("draft");
  const [paymentStatusDraft, setPaymentStatusDraft] =
    useState<OrdersPaymentStatusOptions>("waiting_first_deposit");
  const [paperweightReceivedDraft, setPaperweightReceivedDraft] =
    useState(false);
  const [orderExtrasDraft, setOrderExtrasDraft] =
    useState<OrderExtrasDraft>(defaultExtrasDraft);

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
    setOrderExtrasDraft({
      replacementFlowers: Boolean(order.replacementFlowers),
      replacementFlowersQty: normalizeLoadedNumber(order.replacementFlowersQty),
      replacementFlowersPrice: normalizeLoadedNumber(
        order.replacementFlowersPrice,
      ),
      collectionQty: normalizeLoadedNumber(order.collectionQty),
      collectionPrice: normalizeLoadedNumber(order.collectionPrice),
      deliveryQty: normalizeLoadedNumber(order.deliveryQty),
      deliveryPrice: normalizeLoadedNumber(order.deliveryPrice),
      returnUnusedFlowers: Boolean(order.returnUnusedFlowers),
      returnUnusedFlowersPrice: normalizeLoadedNumber(
        order.returnUnusedFlowersPrice,
      ),
      artistHours: normalizeLoadedNumber(order.artistHours),
      notes: order.notes ?? "",
    });
  }, [order]);

  const lineItems = useMemo(
    () => buildLineItems(frames, paperweight),
    [frames, paperweight],
  );
  const totals = useMemo(
    () => buildTotals(lineItems, orderExtrasDraft),
    [lineItems, orderExtrasDraft],
  );
  const orderExtrasSummary = useMemo(
    () => buildExtrasSummary(orderExtrasDraft),
    [orderExtrasDraft],
  );

  const { deleteOrder, isDeleting } = useOrderDeleteMutation(order?.orderId);
  const { saveExtras, isSavingExtras } = useOrderExtrasMutations(
    order?.orderId,
  );
  const { updateFrameCompletion, isSavingCompletion } = useFrameMutations(
    order?.orderId,
  );
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
  const isDraftOrCancelled =
    orderStatusDraft === "draft" || orderStatusDraft === "cancelled";
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

  const hasPaperweight = Boolean(paperweight?.paperWeightId);
  const framesComplete = useMemo(
    () =>
      frames.length === 0 ||
      frames.every(
        (frame) =>
          Boolean(frame.artworkComplete) && Boolean(frame.framingComplete),
      ),
    [frames],
  );
  const paperweightComplete = useMemo(
    () => !hasPaperweight || paperweightReceivedDraft,
    [hasPaperweight, paperweightReceivedDraft],
  );
  const readyEligible = framesComplete && paperweightComplete;
  const deliveredEligible =
    readyEligible &&
    paymentStatusDraft === "final_balance_paid" &&
    outstandingBalance === 0;

  const paymentIndex = PAYMENT_STATUS_SEQUENCE.indexOf(paymentStatusDraft);
  const firstPaidIndex = PAYMENT_STATUS_SEQUENCE.indexOf("first_deposit_paid");
  const hasFirstPayment = paymentIndex >= firstPaidIndex;

  const allowedOrderStatuses: Record<
    OrdersOrderStatusOptions,
    OrdersOrderStatusOptions[]
  > = {
    draft: ["draft", "in_progress", "cancelled"],
    in_progress: ["in_progress", "draft", "cancelled", "ready"],
    cancelled: ["cancelled", "draft"],
    ready: ["ready", "in_progress", "cancelled", "delivered", "collected"],
    delivered: ["delivered"],
    collected: ["collected"],
  };

  const isOrderStatusDisabled = (status: OrdersOrderStatusOptions) => {
    if (!allowedOrderStatuses[orderStatusDraft].includes(status)) return true;
    if (status === "in_progress") return !hasFirstPayment;
    if (status === "ready") return !readyEligible;
    if (status === "delivered" || status === "collected") {
      return !deliveredEligible;
    }
    return false;
  };

  const { canSendEmails, sendEmail, emailStatus } = useEmailActions({
    customer,
    order,
    frames,
    paperweight,
    extras: orderExtrasDraft,
    totals: invoiceTotals,
  });
  const canSendOrderEmails = canSendEmails && !isDraftOrCancelled;

  const {
    data: emailLogs,
    isLoading: isLoadingLogs,
    isError: isLogsError,
  } = useEmailLogsQuery(order?.orderId);

  const handleSaveExtras = async () => {
    if (!order?.orderId) return;

    const payload: Update<"orders"> = {
      notes: orderExtrasDraft.notes ?? "",
      replacementFlowers: orderExtrasDraft.replacementFlowers,
      replacementFlowersQty:
        orderExtrasDraft.replacementFlowersQty ?? undefined,
      replacementFlowersPrice:
        orderExtrasDraft.replacementFlowersPrice ?? undefined,
      collectionQty: orderExtrasDraft.collectionQty ?? undefined,
      collectionPrice: orderExtrasDraft.collectionPrice ?? undefined,
      deliveryQty: orderExtrasDraft.deliveryQty ?? undefined,
      deliveryPrice: orderExtrasDraft.deliveryPrice ?? undefined,
      returnUnusedFlowers: orderExtrasDraft.returnUnusedFlowers,
      returnUnusedFlowersPrice:
        orderExtrasDraft.returnUnusedFlowersPrice ?? undefined,
      artistHours: orderExtrasDraft.artistHours ?? undefined,
    };

    await saveExtras(payload);
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
    }
  };

  const handleToggleArtworkComplete = async (
    frame: OrderFrame,
    next: boolean,
  ) => {
    if (!frame.frameId) return;
    await updateFrameCompletion({
      frameId: frame.frameId,
      artworkComplete: next,
    });
  };

  const handleToggleFramingComplete = async (
    frame: OrderFrame,
    next: boolean,
  ) => {
    if (!frame.frameId) return;
    await updateFrameCompletion({
      frameId: frame.frameId,
      framingComplete: next,
    });
  };

  const openEditModal = (stage: FormStage, bouquetId?: string | null) => {
    setCurrentFormStage(stage);
    setSelectedBouquetId(bouquetId ?? null);
    setIsEditModalOpen(true);
  };

  const handlePreviewInvoice = () => {
    if (!order?.orderId || isDraftOrCancelled) return;

    const payload = buildEmailPayload({
      customer,
      order,
      frames,
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
    <Box p="4" style={{ margin: "0 auto", maxWidth: 1100 }} width="100%">
      <OrderHeader
        orderLabel={`${orderLabel}`}
        onBack={() => navigate(-1)}
        actionsHelperText={
          isDraftOrCancelled
            ? "Invoice preview and emails are disabled for draft/cancelled orders."
            : undefined
        }
      />
      <OrderActionsBar
        created={order?.created}
        occasionDate={order?.occasionDate}
        requiredBy={order?.requiredBy}
        orderStatus={orderStatusDraft}
        paymentStatus={paymentStatusDraft}
        onPreviewInvoice={handlePreviewInvoice}
        onOpenEmailActions={() => setIsEmailDrawerOpen(true)}
        onOpenSms={() => setIsSmsOpen(true)}
        onOpenSmsLogs={() => setSmsLogsOpen(true)}
        onUpdateStatus={updateStatus}
        isUpdatingStatus={isUpdatingStatus}
        isStatusDisabled={isOrderStatusDisabled}
        previewDisabled={!order?.orderId || isDraftOrCancelled}
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
          onCreate={addPayment}
          onUpdate={updatePayment}
          disabled={orderStatusDraft === "cancelled"}
        />
      </Box>
      <Box mt="4">
        <OrderItemsTable
          lineItems={lineItems}
          paperweight={paperweight}
          paperweightReceived={paperweightReceivedDraft}
          onEditFrame={(frameId) => openEditModal("bouquet_data", frameId)}
          onEditPaperweight={() => openEditModal("paperweight_data")}
          onToggleArtworkComplete={handleToggleArtworkComplete}
          onToggleFramingComplete={handleToggleFramingComplete}
          onTogglePaperweightReceived={handleTogglePaperweightReceived}
          isSavingCompletion={isSavingCompletion}
          isSavingPaperweight={isSavingPaperweight}
        />
      </Box>
      <Box mt="4">
        <OrderExtrasAccordion
          orderExtras={orderExtrasDraft}
          summary={orderExtrasSummary}
          open={orderExtrasOpen}
          onOpenChange={setOrderExtrasOpen}
          onUpdateField={(key, value) =>
            setOrderExtrasDraft((prev) => ({ ...prev, [key]: value }))
          }
          onSave={handleSaveExtras}
          isSaving={isSavingExtras}
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
        disabledMessage={
          isDraftOrCancelled
            ? "Emails are disabled for draft or cancelled orders."
            : undefined
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
