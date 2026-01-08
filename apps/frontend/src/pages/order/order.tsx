/* eslint-disable @typescript-eslint/no-unused-vars */
import { Fragment, type FC, useEffect, useMemo, useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Card,
  Badge,
  Checkbox,
  Select,
  Table,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { NormalisedCustomer } from "@/api/get-customers";
import { getCustomerByOrderId } from "@/api/get-customers";
import { pb } from "@/services/pb/client";
import {
  COLLECTIONS,
  ORDER_PAYMENT_STATUS_OPTIONS,
  ORDER_STATUS_OPTIONS,
} from "@/services/pb/constants";
import type {
  OrdersOrderStatusOptions,
  OrdersPaymentStatusOptions,
  Update,
} from "@/services/pb/types";
import {
  formatCurrency,
  formatDate,
  formatSnakeCase,
  getOrderStatusColor,
  getPaymentStatusColor,
} from "@/utils";
import { updateBouquet } from "@/api/update-bouquet";
import { updatePaperweight } from "@/api/update-paperweight";
import CreateNewOrderModal, {
  type FormStage,
} from "@/pages/home/components/create-new-order-modal/create-new-order-modal";
import { buildCustomerFormDefaults } from "@/pages/home/components/create-new-order-modal/create-new-order-modal.utils";
import type { ModalMode } from "@/pages/home/home";

import accordionStyles from "./order-accordion.module.css";

// convenience alias
type OrderFrame =
  NonNullable<NormalisedCustomer["orderDetails"]>["frameOrder"][number];

type EmailAction = "recommendation" | "invoice";
type BadgeColor = React.ComponentProps<typeof Badge>["color"];
type OrderExtrasState = {
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
type StatusControl<T extends string> = {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
};

const Order: FC = () => {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const queryClient = useQueryClient();

  const {
    data: customer,
    isLoading: isLoadingCustomer,
    isError: isCustomerError,
  } = useQuery({
    queryKey: ["customer", orderId],
    queryFn: () => getCustomerByOrderId(orderId ?? ""),
    enabled: Boolean(orderId),
  });

  const order = customer?.orderDetails;
  const [frames, setFrames] = useState<OrderFrame[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentFormStage, setCurrentFormStage] =
    useState<FormStage>("bouquet_data");
  const [selectedBouquetId, setSelectedBouquetId] = useState<string | null>(
    null,
  );
  const modalMode: ModalMode = "edit";
  const currentCustomerForm = useMemo(() => {
    if (!customer) return null;
    return buildCustomerFormDefaults(customer);
  }, [customer]);

  const paperweight = order?.paperWeightOrder ?? null;

  const [paperweightReceived, setPaperweightReceived] =
    useState<boolean>(false);

  // --- Editable status fields (typed to PB enums) ---
  const [orderStatus, setOrderStatus] = useState<OrdersOrderStatusOptions>(
    "draft",
  );

  const [paymentStatus, setPaymentStatus] =
    useState<OrdersPaymentStatusOptions>("waiting_first_deposit");
  const [orderExtrasOpen, setOrderExtrasOpen] = useState(false);
  const [orderExtras, setOrderExtras] = useState<OrderExtrasState>({
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
  });

  const normalizeLoadedNumber = (value?: number | null) =>
    value == null || value === 0 ? null : value;

  useEffect(() => {
    if (!order) return;
    setFrames(order.frameOrder ?? []);
    setOrderStatus(order.orderStatus ?? "draft");
    setPaymentStatus(order.paymentStatus ?? "waiting_first_deposit");
    setPaperweightReceived(Boolean(order.paperWeightOrder?.paperweightReceived));
    setOrderExtras({
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

  const statusControls: [
    StatusControl<OrdersOrderStatusOptions>,
    StatusControl<OrdersPaymentStatusOptions>,
  ] = [
      {
        label: "Order status",
        value: orderStatus,
        onChange: setOrderStatus,
        options: ORDER_STATUS_OPTIONS,
      },
      {
        label: "Payment status",
        value: paymentStatus,
        onChange: setPaymentStatus,
        options: ORDER_PAYMENT_STATUS_OPTIONS,
      },
    ];

  // -----------------------------
  // Order meta update (status + payment)
  // -----------------------------
  const { mutateAsync: mutateOrderMeta, isPending: isSavingMeta } = useMutation(
    {
      mutationFn: (payload: {
        orderId: string;
        orderStatus: OrdersOrderStatusOptions;
        paymentStatus: OrdersPaymentStatusOptions;
      }) => {
        const data: Update<"orders"> = {
          orderStatus: payload.orderStatus,
          payment_status: payload.paymentStatus,
        };

        return pb.collection(COLLECTIONS.ORDERS).update(payload.orderId, data);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        if (orderId) {
          queryClient.invalidateQueries({ queryKey: ["customer", orderId] });
        }
      },
    },
  );

  const { mutateAsync: mutateOrderExtras, isPending: isSavingExtras } =
    useMutation({
      mutationFn: (payload: Update<"orders">) =>
        pb.collection(COLLECTIONS.ORDERS).update(order?.orderId || "", payload),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        if (orderId) {
          queryClient.invalidateQueries({ queryKey: ["customer", orderId] });
        }
      },
    });

  const handleSaveMeta = async () => {
    if (!order?.orderId) return;
    await mutateOrderMeta({
      orderId: order.orderId,
      orderStatus,
      paymentStatus,
    });
  };

  const handleSaveExtras = async () => {
    if (!order?.orderId) return;
    await mutateOrderExtras({
      notes: orderExtras.notes ?? "",
      replacementFlowers: orderExtras.replacementFlowers,
      replacementFlowersQty: orderExtras.replacementFlowersQty ?? undefined,
      replacementFlowersPrice: orderExtras.replacementFlowersPrice ?? undefined,
      collectionQty: orderExtras.collectionQty ?? undefined,
      collectionPrice: orderExtras.collectionPrice ?? undefined,
      deliveryQty: orderExtras.deliveryQty ?? undefined,
      deliveryPrice: orderExtras.deliveryPrice ?? undefined,
      returnUnusedFlowers: orderExtras.returnUnusedFlowers,
      returnUnusedFlowersPrice: orderExtras.returnUnusedFlowersPrice ?? undefined,
      artistHours: orderExtras.artistHours ?? undefined,
    });
  };

  // -----------------------------
  // Paperweight received update
  // -----------------------------
  const { mutateAsync: mutatePaperweightReceived, isPending: isSavingPw } =
    useMutation({
      mutationFn: async (payload: {
        paperweightId: string;
        received: boolean;
        quantity: number;
        price: number;
      }) => {
        return updatePaperweight({
          id: payload.paperweightId,
          quantity: payload.quantity,
          price: payload.price,
          paperweightReceived: payload.received,
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        if (orderId) {
          queryClient.invalidateQueries({ queryKey: ["customer", orderId] });
        }
      },
    });

  const handleTogglePaperweightReceived = async (next: boolean) => {
    if (!paperweight?.paperWeightId) return;
    setPaperweightReceived(next);
    try {
      await mutatePaperweightReceived({
        paperweightId: paperweight.paperWeightId,
        received: next,
        quantity: paperweight.quantity ?? 1,
        price: paperweight.price ?? 0,
      });
    } catch {
      // revert on error
      setPaperweightReceived((prev) => !prev);
    }
  };

  // helper to update a single frame locally after dialog save
  const handleFrameUpdated = (frameId: string, patch: Partial<OrderFrame>) => {
    setFrames((prev) =>
      prev.map((f) => (f.frameId === frameId ? { ...f, ...patch } : f)),
    );
  };

  // -----------------------------
  // Frame completion toggles per bouquet (persist to BE)
  // -----------------------------
  const { mutateAsync: mutateFrameCompletion, isPending: isSavingCompletion } =
    useMutation({
      mutationFn: async (payload: {
        frameId: string;
        artworkComplete?: boolean;
        framingComplete?: boolean;
      }) => {
        return updateBouquet(payload);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        if (orderId) {
          queryClient.invalidateQueries({ queryKey: ["customer", orderId] });
        }
      },
    });

  const handleToggleArtworkComplete = async (
    frame: OrderFrame,
    next: boolean,
  ) => {
    if (!frame.frameId) return;
    handleFrameUpdated(frame.frameId, { artworkComplete: next });

    try {
      await mutateFrameCompletion({
        frameId: frame.frameId,
        artworkComplete: next,
      });
    } catch {
      // revert on error
      handleFrameUpdated(frame.frameId, {
        artworkComplete: !next,
      });
    }
  };

  const handleToggleFramingComplete = async (
    frame: OrderFrame,
    next: boolean,
  ) => {
    if (!frame.frameId) return;
    handleFrameUpdated(frame.frameId, { framingComplete: next });

    try {
      await mutateFrameCompletion({
        frameId: frame.frameId,
        framingComplete: next,
      });
    } catch {
      // revert on error
      handleFrameUpdated(frame.frameId, {
        framingComplete: !next,
      });
    }
  };

  // -----------------------------
  const getMountColour = (frame: OrderFrame) => frame.mountColour ?? null;

  // Build invoice line items (kept for email payload, but not shown)
  // -----------------------------
  type LineItemKind = "frame" | "paperweight" | "extra";

  type LineItem = {
    id: string;
    description: string;
    qty: number;
    unitPrice: number;
    total: number;
    kind: LineItemKind;
    frame?: OrderFrame;
  };

  const lineItems: LineItem[] = useMemo(() => {
    const items: LineItem[] = [];

    frames.forEach((frame, index) => {
      const mountColour = getMountColour(frame);

      const descParts = [
        frame.size,
        frame.frameType,
        frame.glassType,
        frame.preservationType,
        mountColour ? `Mount: ${mountColour}` : null,
      ].filter(Boolean);

      const description = descParts.join(", ");
      const basePrice = typeof frame.price === "number" ? frame.price : 0;

      const baseId = frame.frameId ?? `frame-${index}`;

      items.push({
        id: baseId,
        description,
        qty: 1,
        unitPrice: basePrice,
        total: basePrice,
        kind: "frame",
        frame,
      });

      const extras = frame.extras ?? null;

      if (typeof extras?.mountPrice === "number" && extras.mountPrice > 0) {
        const mountSuffix =
          frame.inclusions === "Buttonhole" ? " · Buttonhole" : "";
        items.push({
          id: `${baseId}-mount`,
          description: `${mountColour ? `Mount – ${mountColour}` : "Mount"
            }${mountSuffix}`,
          qty: 1,
          unitPrice: extras.mountPrice,
          total: extras.mountPrice,
          kind: "extra",
          frame,
        });
      }

      if (typeof extras?.glassPrice === "number" && extras.glassPrice > 0) {
        items.push({
          id: `${baseId}-glass`,
          description: `Glass – ${frame.glassType}`,
          qty: 1,
          unitPrice: extras.glassPrice,
          total: extras.glassPrice,
          kind: "extra",
          frame,
        });
      }

      if (
        typeof extras?.glassEngravingPrice === "number" &&
        extras.glassEngravingPrice > 0
      ) {
        const engravingText = frame.glassEngraving?.trim();
        items.push({
          id: `${baseId}-glass-engraving`,
          description: engravingText
            ? `Glass engraving – ${engravingText}`
            : "Glass engraving",
          qty: 1,
          unitPrice: extras.glassEngravingPrice,
          total: extras.glassEngravingPrice,
          kind: "extra",
          frame,
        });
      }
    });

    if (paperweight) {
      const total =
        typeof paperweight.price === "number" ? paperweight.price : 0;
      const qty =
        paperweight.quantity != null ? Number(paperweight.quantity) : 1;

      items.push({
        id: paperweight.paperWeightId ?? "paperweight",
        description: "Paperweight",
        qty,
        unitPrice: qty ? total / qty : total,
        total,
        kind: "paperweight",
      });
    }

    return items;
  }, [frames, paperweight]);

  const subTotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const vatRate = 0.2;
  const vatTotal = subTotal * vatRate;
  const grandTotal = subTotal + vatTotal;

  // -----------------------------
  // Email actions
  // -----------------------------
  const canSendEmails = useMemo(() => {
    return !!pb.authStore.token && typeof pb.baseUrl === "string";
  }, []);

  const emailPayload = useMemo(() => {
    return {
      customer: {
        id: customer?.customerId,
        title: customer?.title ?? undefined,
        firstName: customer?.firstName ?? "",
        surname: customer?.surname ?? "",
        email: customer?.email ?? "",
        displayName: customer?.displayName,
        phoneNumber: customer?.phoneNumber ?? "",
      },
      order: {
        orderId: order?.orderId,
        orderNo: order?.orderNo,
        created: order?.created ? formatDate(order?.created) : "",
        occasionDate: order?.occasionDate ? formatDate(order?.occasionDate) : "",
        billingAddressLine1: order?.billingAddressLine1,
        billingAddressLine2: order?.billingAddressLine2,
        billingTown: order?.billingTown,
        billingCounty: order?.billingCounty,
        billingPostcode: order?.billingPostcode,
      },
      orderExtras: {
        replacementFlowers: orderExtras.replacementFlowers,
        replacementFlowersQty: orderExtras.replacementFlowersQty,
        replacementFlowersPrice: orderExtras.replacementFlowersPrice,
        collectionQty: orderExtras.collectionQty,
        collectionPrice: orderExtras.collectionPrice,
        deliveryQty: orderExtras.deliveryQty,
        deliveryPrice: orderExtras.deliveryPrice,
        returnUnusedFlowers: orderExtras.returnUnusedFlowers,
        returnUnusedFlowersPrice: orderExtras.returnUnusedFlowersPrice,
        artistHours: orderExtras.artistHours,
        notes: orderExtras.notes,
      },
      frames,
      paperweight,
      totals: {
        subTotal,
        vatRate,
        vatTotal,
        grandTotal,
      },
    };
  }, [
    customer,
    order,
    orderExtras,
    frames,
    paperweight,
    subTotal,
    vatTotal,
    grandTotal,
  ]);

  const getAuthHeader = () => {
    const token = pb.authStore.token;
    return token ? { Authorization: token } : {};
  };

  const postEmailAction = async (
    action: EmailAction,
    payload: typeof emailPayload,
  ) => {
    const url =
      action === "recommendation"
        ? `${pb.baseUrl}/api/email/recommendation`
        : `${pb.baseUrl}/api/email/invoice`;

    const res = await fetch(url, {
      method: "POST",
      // @ts-expect-error - TODO figure how to fix this issue
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
        // @ts-expect-error - TODO figure how to fix this issue
      } satisfies Record<string, string>,
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        (json && (json.error || json.message)) ||
        `Request failed (${res.status})`;
      throw new Error(msg);
    }

    return json as { ok: true };
  };

  const [emailStatus, setEmailStatus] = useState<{
    kind: EmailAction;
    state: "idle" | "sending" | "success" | "error";
    message?: string;
  } | null>(null);

  // @ts-expect-error - It would be hooked after
  const { mutateAsync: sendRecommendation, isPending: isSendingRec } =
    useMutation({
      mutationFn: (payload: typeof emailPayload) =>
        postEmailAction("recommendation", payload),
      onMutate: () =>
        setEmailStatus({ kind: "recommendation", state: "sending" }),
      onSuccess: () =>
        setEmailStatus({
          kind: "recommendation",
          state: "success",
          message: "Recommendation email sent",
        }),
      onError: (err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to send recommendation";
        setEmailStatus({
          kind: "recommendation",
          state: "error",
          message,
        });
      },
    });

  // @ts-expect-error - It would be hooked after
  const { mutateAsync: sendInvoice, isPending: isSendingInv } = useMutation({
    mutationFn: (payload: typeof emailPayload) =>
      postEmailAction("invoice", payload),
    onMutate: () => setEmailStatus({ kind: "invoice", state: "sending" }),
    onSuccess: () =>
      setEmailStatus({
        kind: "invoice",
        state: "success",
        message: "Invoice email sent",
      }),
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to send invoice";
      setEmailStatus({
        kind: "invoice",
        state: "error",
        message,
      });
    },
  });

  // @ts-expect-error - It would be hooked after
  const handleSendRecommendation = async () => {
    if (!canSendEmails) return;
    await sendRecommendation(emailPayload);
  };

  // @ts-expect-error - It would be hooked after
  const handleSendInvoice = async () => {
    if (!canSendEmails) return;
    await sendInvoice(emailPayload);
  };

  const statusColor = (state: string): BadgeColor => {
    if (state === "success") return "green";
    if (state === "error") return "red";
    return "gray";
  };

  // -----------------------------
  // ✅ UPDATED: Preview invoice (navigate to InvoicePreview page; no popups)
  // -----------------------------
  const handlePreviewInvoice = () => {
    if (!pb.authStore.token) {
      setEmailStatus({
        kind: "invoice",
        state: "error",
        message: "You must be logged in to preview invoices.",
      });
      return;
    }

    navigate("/invoice-preview", {
      state: { payload: emailPayload },
    });
  };

  // -----------------------------
  // Derived UI pieces
  // -----------------------------
  const frameExtrasByFrameId = useMemo(() => {
    const map = new Map<
      string,
      Array<{ id: string; description: string; total: number }>
    >();

    lineItems.forEach((li) => {
      if (li.kind !== "extra" || !li.frame?.frameId) return;
      const key = li.frame.frameId;
      const arr = map.get(key) ?? [];
      arr.push({ id: li.id, description: li.description, total: li.total });
      map.set(key, arr);
    });

    return map;
  }, [lineItems]);

  const openEditModal = (stage: FormStage, bouquetId?: string | null) => {
    setCurrentFormStage(stage);
    setSelectedBouquetId(bouquetId ?? null);
    setIsEditModalOpen(true);
  };

  const mainItems = lineItems.filter((item) => item.kind !== "extra");

  const updateExtrasField = <K extends keyof OrderExtrasState>(
    key: K,
    value: OrderExtrasState[K],
  ) => {
    setOrderExtras((prev) => ({ ...prev, [key]: value }));
  };

  const parseNumberInput = (value: string) =>
    value.trim() === "" ? null : Number(value);

  const orderExtrasRows: Array<{
    id: string;
    label: string;
    toggleKey?: "replacementFlowers" | "returnUnusedFlowers";
    qtyKey?: keyof OrderExtrasState;
    priceKey?: keyof OrderExtrasState;
  }> = [
      {
        id: "replacement-flowers",
        label: "Replacement flowers",
        toggleKey: "replacementFlowers",
        qtyKey: "replacementFlowersQty",
        priceKey: "replacementFlowersPrice",
      },
      {
        id: "collection",
        label: "Collection",
        qtyKey: "collectionQty",
        priceKey: "collectionPrice",
      },
      {
        id: "delivery",
        label: "Delivery",
        qtyKey: "deliveryQty",
        priceKey: "deliveryPrice",
      },
      {
        id: "return-unused-flowers",
        label: "Return unused flowers",
        toggleKey: "returnUnusedFlowers",
        priceKey: "returnUnusedFlowersPrice",
      },
    ];

  const orderExtrasSummary = useMemo(() => {
    const items: string[] = [];
    const formatQtyPrice = (
      label: string,
      qty?: number | null,
      price?: number | null,
    ) => {
      if (!qty || !price || price === 0 || qty === 0) return null;
      const parts = [label];
      if (qty != null && qty > 0) parts.push(`Qty ${qty}`);
      if (price != null) parts.push(formatCurrency(price) as string);
      return parts.join(" · ");
    };

    if (
      orderExtras.replacementFlowers ||
      (orderExtras.replacementFlowersQty &&
        orderExtras.replacementFlowersQty > 0) ||
      (orderExtras.replacementFlowersPrice &&
        orderExtras.replacementFlowersPrice > 0)
    ) {
      items.push(
        formatQtyPrice(
          "Replacement flowers",
          orderExtras.replacementFlowersQty,
          orderExtras.replacementFlowersPrice,
        ) || "Replacement flowers",
      );
    }

    const collection = formatQtyPrice(
      "Collection",
      orderExtras.collectionQty,
      orderExtras.collectionPrice,
    );
    if (collection) items.push(collection);

    const delivery = formatQtyPrice(
      "Delivery",
      orderExtras.deliveryQty,
      orderExtras.deliveryPrice,
    );
    if (delivery) items.push(delivery);

    if (
      orderExtras.returnUnusedFlowers ||
      (orderExtras.returnUnusedFlowersPrice &&
        orderExtras.returnUnusedFlowersPrice > 0)
    ) {
      const returnUnused =
        orderExtras.returnUnusedFlowersPrice != null
          ? `Return unused flowers · ${formatCurrency(
            orderExtras.returnUnusedFlowersPrice,
          )}`
          : "Return unused flowers";
      items.push(returnUnused);
    }

    if (orderExtras && orderExtras.artistHours && orderExtras.artistHours > 0) {
      items.push(`Artist hours · ${orderExtras.artistHours}`);
    }

    const trimmedNotes = orderExtras.notes.trim();
    if (trimmedNotes.length > 0) {
      const shortNote =
        trimmedNotes.length > 36
          ? `${trimmedNotes.slice(0, 36)}…`
          : trimmedNotes;
      items.push(`Notes · ${shortNote}`);
    }

    return items;
  }, [orderExtras]);

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
          We couldn’t load this order.
        </Text>
        <Button variant="ghost" size="1" onClick={() => navigate("/")}>
          ← Customers
        </Button>
      </Box>
    );
  }

  return (
    <Box p="4" style={{ margin: "0 auto", maxWidth: 1100 }} width="100%">
      <Flex justify="between" align="center" mb="3" gap="3" wrap="wrap">
        <Flex direction="column" gap="1">
          <Button
            variant="ghost"
            size="1"
            onClick={() => navigate("/")}
            style={{ paddingLeft: 0 }}
          >
            ← Customers
          </Button>
          <Heading size="4">
            Order {order?.orderNo ?? order?.orderId ?? ""}
          </Heading>
        </Flex>
        <Flex gap="2" align="center" wrap="wrap" justify="end">
          <Button
            variant="soft"
            onClick={handlePreviewInvoice}
            disabled={!order?.orderId}
          >
            Preview invoice
          </Button>
          {/* <Button
            variant="soft"
            onClick={handleSendRecommendation}
            disabled={!canSendEmails || isSendingRec}
          >
            {isSendingRec ? "Sending..." : "Send recommendation"}
          </Button>
          <Button
            onClick={handleSendInvoice}
            disabled={!canSendEmails || isSendingInv}
          >
            {isSendingInv ? "Sending..." : "Send invoice"}
          </Button> */}
        </Flex>
      </Flex>

      <Card mb="3">
        <Flex justify="between" align="center" wrap="wrap" gap="3">
          <Flex gap="2" wrap="wrap">
            {order?.created ? (
              <Badge variant="soft" color="gray">
                Created {formatDate(order.created)}
              </Badge>
            ) : null}
            {order?.occasionDate ? (
              <Badge variant="soft" color="gray">
                Occasion {formatDate(order.occasionDate)}
              </Badge>
            ) : null}
          </Flex>
          <Flex gap="2" wrap="wrap">
            <Badge
              variant="soft"
              color={getOrderStatusColor(orderStatus) as BadgeColor}
            >
              {formatSnakeCase(orderStatus)}
            </Badge>
            <Badge
              variant="soft"
              color={getPaymentStatusColor(paymentStatus) as BadgeColor}
            >
              {formatSnakeCase(paymentStatus)}
            </Badge>
          </Flex>
        </Flex>
      </Card>

      {emailStatus && emailStatus.state !== "idle" ? (
        <Box mb="3">
          <Text size="2" color={statusColor(emailStatus.state)}>
            {emailStatus.message ||
              (emailStatus.state === "sending" ? "Sending email..." : "")}
          </Text>
          {!canSendEmails ? (
            <Text size="1" color="gray">
              Make sure you’re logged in before sending emails.
            </Text>
          ) : null}
        </Box>
      ) : null}

      <Card>
        <Flex justify="between" align="start" gap="4" wrap="wrap">
          <Box>
            <Heading size="3" mb="1">
              Actions
            </Heading>
            <Text size="2" color="gray">
              Update status/payment, and manage items below.
            </Text>
          </Box>
          <Flex gap="3" align="end" wrap="wrap">
            {statusControls.map((control) => (
              <Flex key={control.label} direction="column" gap="1">
                <Text size="1" color="gray">
                  {control.label}
                </Text>
                <Select.Root
                  value={control.value}
                  onValueChange={(value) =>
                    // @ts-expect-error - onChange is never
                    control.onChange(value as typeof control.value)
                  }
                >
                  <Select.Trigger />
                  <Select.Content>
                    {control.options.map((status) => (
                      <Select.Item key={status} value={status}>
                        {formatSnakeCase(status)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>
            ))}
            <Button
              size="2"
              onClick={handleSaveMeta}
              disabled={!order?.orderId || isSavingMeta}
            >
              {isSavingMeta ? "Saving..." : "Update"}
            </Button>
          </Flex>
        </Flex>
      </Card>

      <Box mt="4">
        {mainItems.length === 0 ? (
          <Card>
            <Text size="2" color="gray">
              No items found on this order.
            </Text>
          </Card>
        ) : (
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>#</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Qty</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Unit price</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Amount</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Options</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {mainItems.map((item, index) => {
                const isFrame = item.kind === "frame";
                const extras =
                  isFrame && item.frame?.frameId
                    ? frameExtrasByFrameId.get(item.frame.frameId) ?? []
                    : [];

                return (
                  <Fragment key={item.id}>
                    <Table.Row>
                      <Table.Cell>{`Item ${index + 1}`}</Table.Cell>
                      <Table.Cell>{item.description}</Table.Cell>
                      <Table.Cell>{item.qty}</Table.Cell>
                      <Table.Cell>{formatCurrency(item.unitPrice)}</Table.Cell>
                      <Table.Cell>{formatCurrency(item.total)}</Table.Cell>
                      <Table.Cell>
                        {item.kind === "frame" && item.frame ? (
                          <Flex direction="column" gap="2" align="start">
                            <Button
                              size="1"
                              variant="soft"
                              onClick={() =>
                                openEditModal(
                                  "bouquet_data",
                                  item.frame?.frameId,
                                )
                              }
                            >
                              Frame options
                            </Button>
                            <InlineToggle
                              label="Artwork complete"
                              checked={Boolean(item.frame.artworkComplete)}
                              onChange={(next) =>
                                handleToggleArtworkComplete(item.frame!, next)
                              }
                              disabled={
                                !item.frame.frameId || isSavingCompletion
                              }
                            />
                            <InlineToggle
                              label="Framing complete"
                              checked={Boolean(item.frame.framingComplete)}
                              onChange={(next) =>
                                handleToggleFramingComplete(item.frame!, next)
                              }
                              disabled={
                                !item.frame.frameId || isSavingCompletion
                              }
                            />
                            {item.frame.preservationDate ? (
                              <Badge variant="soft" color="blue">
                                Preservation{" "}
                                {formatDate(item.frame.preservationDate)}
                              </Badge>
                            ) : null}
                          </Flex>
                        ) : item.kind === "paperweight" ? (
                          <Flex direction="column" gap="2" align="start">
                            <Button
                              size="1"
                              variant="soft"
                              onClick={() => openEditModal("paperweight_data")}
                            >
                              Paperweight options
                            </Button>
                            <InlineToggle
                              label="Received"
                              checked={paperweightReceived}
                              onChange={handleTogglePaperweightReceived}
                              disabled={
                                !paperweight?.paperWeightId || isSavingPw
                              }
                            />
                          </Flex>
                        ) : null}
                      </Table.Cell>
                    </Table.Row>
                    {extras.map((extra) => (
                      <Table.Row key={`${item.id}-${extra.id}`}>
                        <Table.Cell />
                        <Table.Cell>
                          <Text size="2" color="gray">
                            {extra.description}
                          </Text>
                        </Table.Cell>
                        <Table.Cell />
                        <Table.Cell />
                        <Table.Cell>{formatCurrency(extra.total)}</Table.Cell>
                        <Table.Cell />
                      </Table.Row>
                    ))}
                  </Fragment>
                );
              })}
            </Table.Body>
          </Table.Root>
        )}
      </Box>

      <Box mt="4">
        <Accordion.Root
          className={accordionStyles.root}
          type="single"
          collapsible
          value={orderExtrasOpen ? "order-extras" : ""}
          onValueChange={(value) => setOrderExtrasOpen(value === "order-extras")}
        >
          <Accordion.Item className={accordionStyles.item} value="order-extras">
            <Accordion.Header className={accordionStyles.header}>
              <Accordion.Trigger className={accordionStyles.trigger}>
                <Flex
                  direction="column"
                  gap="1"
                  align="start"
                  className={accordionStyles.triggerContent}
                >
                  <Heading size="3">Order extras</Heading>
                  {orderExtrasSummary.length > 0 ? (
                    <Flex gap="2" wrap="wrap">
                      {orderExtrasSummary.map((summary) => (
                        <Badge key={summary} variant="soft" color="gray">
                          {summary}
                        </Badge>
                      ))}
                    </Flex>
                  ) : (
                    <Text size="1" color="gray">
                      No extras added yet
                    </Text>
                  )}
                </Flex>
                <Flex
                  align="center"
                  gap="2"
                  className={accordionStyles.triggerMeta}
                >
                  <Text size="1" color="gray">
                    {orderExtrasOpen ? "Hide details" : "Add details"}
                  </Text>
                  <ChevronDownIcon
                    className={accordionStyles.chevron}
                    aria-hidden
                  />
                </Flex>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className={accordionStyles.content}>
              <Box className={accordionStyles.contentInner}>
                <Flex direction="column" gap="3">
                  <Table.Root variant="surface">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeaderCell>
                          Description
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Y / N</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Qty</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Price</Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {orderExtrasRows.map((row) => {
                        const isEnabled = row.toggleKey
                          ? orderExtras[row.toggleKey]
                          : true;
                        return (
                          <Table.Row key={row.id}>
                            <Table.Cell>{row.label}</Table.Cell>
                            <Table.Cell>
                              {row.toggleKey ? (
                                <Checkbox
                                  checked={orderExtras[row.toggleKey]}
                                  onCheckedChange={(checked) =>
                                    updateExtrasField(
                                      // @ts-expect-error - could be undefined
                                      row.toggleKey,
                                      Boolean(checked),
                                    )
                                  }
                                />
                              ) : null}
                            </Table.Cell>
                            <Table.Cell>
                              {row.qtyKey ? (
                                <TextField.Root
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={
                                    orderExtras[row.qtyKey] == null
                                      ? ""
                                      : (orderExtras[row.qtyKey] as keyof OrderExtrasState)
                                  }
                                  onChange={(event) =>
                                    updateExtrasField(
                                      // @ts-expect-error - could be undefined
                                      row.qtyKey,
                                      parseNumberInput(
                                        event.target.value,
                                      ) as unknown,
                                    )
                                  }
                                  disabled={!isEnabled}
                                />
                              ) : null}
                            </Table.Cell>
                            <Table.Cell>
                              {row.priceKey ? (
                                <TextField.Root
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    orderExtras[row.priceKey] == null
                                      ? ""
                                      : (orderExtras[row.priceKey] as keyof OrderExtrasState)
                                  }
                                  onChange={(event) =>
                                    updateExtrasField(
                                      // @ts-expect-error - could be undefined
                                      row.priceKey,
                                      parseNumberInput(
                                        event.target.value,
                                      ) as unknown,
                                    )
                                  }
                                  disabled={!isEnabled}
                                />
                              ) : null}
                            </Table.Cell>
                          </Table.Row>
                        );
                      })}
                      <Table.Row>
                        <Table.Cell>Artist hours</Table.Cell>
                        <Table.Cell />
                        <Table.Cell>
                          <TextField.Root
                            type="number"
                            min="0"
                            step="0.1"
                            value={orderExtras.artistHours ?? ""}
                            onChange={(event) =>
                              updateExtrasField(
                                "artistHours",
                                parseNumberInput(event.target.value),
                              )
                            }
                          />
                        </Table.Cell>
                        <Table.Cell />
                      </Table.Row>
                    </Table.Body>
                  </Table.Root>

                  <Box>
                    <Text size="2" weight="medium" mb="1">
                      Notes
                    </Text>
                    <TextArea
                      value={orderExtras.notes}
                      onChange={(event) =>
                        updateExtrasField("notes", event.target.value)
                      }
                      placeholder="Add notes for this order..."
                      resize="vertical"
                    />
                  </Box>

                  <Flex justify="end">
                    <Button
                      size="2"
                      onClick={handleSaveExtras}
                      disabled={!order?.orderId || isSavingExtras}
                    >
                      {isSavingExtras ? "Saving..." : "Save details"}
                    </Button>
                  </Flex>
                </Flex>
              </Box>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>
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
    </Box>
  );
};

export default Order;

/* ---------- Small helper components ---------- */
const InlineToggle: FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ label, checked, onChange, disabled }) => (
  <Flex align="center" gap="2">
    <Checkbox
      checked={checked}
      onCheckedChange={(value) => onChange(!!value)}
      disabled={disabled}
    />
    <Text size="2" color="gray">
      {label}
    </Text>
  </Flex>
);
