import { type FC, useMemo, useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Card,
  Separator,
  Badge,
  Switch,
  Select,
  Dialog,
  TextField,
  type TextProps,
} from "@radix-ui/themes";
import { useLocation, useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { NormalisedCustomer } from "@/api/get-customers";
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
  OrderFrameItemsInclusionsOptions,
  OrderFrameItemsGlassTypeOptions,
} from "@/services/pb/types";
import {
  formatDate,
  formatSnakeCase,
  getOrderStatusColor,
  getPaymentStatusColor,
} from "@/utils";
import { updateBouquet } from "@/api/update-bouquet";

type LocationState = {
  customer: NormalisedCustomer;
};

// convenience alias
// @ts-expect-error not sure why
type OrderFrame = NormalisedCustomer["orderDetails"]["frameOrder"];

const GLASS_TYPE_OPTIONS: {
  value: OrderFrameItemsGlassTypeOptions;
  label: string;
}[] = [
  { value: "Clearview uv glass", label: "Clearview UV glass" },
  { value: "Conservation glass", label: "Conservation glass" },
];

const INCLUSION_OPTIONS: {
  value: OrderFrameItemsInclusionsOptions;
  label: string;
}[] = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
  { value: "Buttonhole", label: "Buttonhole" },
];

const currency = (value?: number | null) =>
  typeof value === "number" ? `£${value.toFixed(2)}` : "£0.00";

type EmailAction = "recommendation" | "invoice";

const Order: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { customer } = location.state as LocationState;

  const order = customer.orderDetails;
  const initialFrames: OrderFrame[] = order?.frameOrder ?? [];
  const [frames, setFrames] = useState<OrderFrame[]>(initialFrames);

  const paperweight = order?.paperWeightOrder ?? null;

  // best-effort: this field name must match your PB schema
  const initialPaperweightReceived =
    // @ts-expect-error depends on your normaliser/schema
    Boolean(order?.paperweightReceived ?? order?.paperWeightReceived ?? false);

  const [paperweightReceived, setPaperweightReceived] = useState<boolean>(
    initialPaperweightReceived,
  );

  // --- Editable status fields (typed to PB enums) ---
  const [orderStatus, setOrderStatus] = useState<OrdersOrderStatusOptions>(
    order?.orderStatus ?? "draft",
  );

  const [paymentStatus, setPaymentStatus] =
    useState<OrdersPaymentStatusOptions>(
      order?.paymentStatus ?? "waiting_first_deposit",
    );

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
      },
    },
  );

  const handleSaveMeta = async () => {
    if (!order?.orderId) return;
    await mutateOrderMeta({
      orderId: order.orderId,
      orderStatus,
      paymentStatus,
    });
  };

  // -----------------------------
  // Paperweight received update (best-effort field name)
  // -----------------------------
  const { mutateAsync: mutatePaperweightReceived, isPending: isSavingPw } =
    useMutation({
      mutationFn: async (payload: { orderId: string; received: boolean }) => {
        // IMPORTANT:
        // Update the key below to match your actual PB field name.
        // Common options:
        // - paperweightReceived
        // - paperweight_received
        // - paperWeightReceived
        const data = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          paperweightReceived: payload.received,
        } as any;

        return pb.collection(COLLECTIONS.ORDERS).update(payload.orderId, data);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      },
    });

  const handleTogglePaperweightReceived = async (next: boolean) => {
    setPaperweightReceived(next);
    if (!order?.orderId) return;
    try {
      await mutatePaperweightReceived({ orderId: order.orderId, received: next });
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
        // updateBouquet should accept these fields in your API.
        // If it doesn't yet, add them server-side or extend the function typing.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return updateBouquet(payload as any);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
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
      const mountColour =
        (frame as any).mountColour ?? (frame as any).frameMountColour ?? null;

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

      const extras = (frame.extras || {}) as {
        glassPrice?: number;
        glassEngravingPrice?: number;
        mountPrice?: number;
      };

      if (typeof extras.mountPrice === "number" && extras.mountPrice > 0) {
        items.push({
          id: `${baseId}-mount`,
          description: mountColour ? `Mount – ${mountColour}` : "Mount",
          qty: 1,
          unitPrice: extras.mountPrice,
          total: extras.mountPrice,
          kind: "extra",
          frame,
        });
      }

      if (typeof extras.glassPrice === "number" && extras.glassPrice > 0) {
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
        typeof extras.glassEngravingPrice === "number" &&
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
        id: (customer as any).customerId,
        title: (customer as any).title ?? undefined,
        firstName: (customer as any).firstName ?? "",
        surname: (customer as any).surname ?? "",
        email: customer.email ?? "",
        displayName: customer.displayName,
        phoneNumber: customer.phoneNumber ?? "",
      },
      order: {
        orderId: order?.orderId,
        orderNo: order?.orderNo,
        created: order?.created ? formatDate(order?.created) : "",
        occasionDate: order?.occasionDate ? formatDate(order?.occasionDate) : "",
        billingAddressLine1: (order as any)?.billingAddressLine1,
        billingAddressLine2: (order as any)?.billingAddressLine2,
        billingTown: (order as any)?.billingTown,
        billingCounty: (order as any)?.billingCounty,
        billingPostcode: (order as any)?.billingPostcode,
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
  }, [customer, order, frames, paperweight, subTotal, vatTotal, grandTotal]);

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
      // @ts-expect-error not sure what
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
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
      onError: (err: any) =>
        setEmailStatus({
          kind: "recommendation",
          state: "error",
          message: err?.message || "Failed to send recommendation",
        }),
    });

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
    onError: (err: any) =>
      setEmailStatus({
        kind: "invoice",
        state: "error",
        message: err?.message || "Failed to send invoice",
      }),
  });

  const handleSendRecommendation = async () => {
    if (!canSendEmails) return;
    await sendRecommendation(emailPayload);
  };

  const handleSendInvoice = async () => {
    if (!canSendEmails) return;
    await sendInvoice(emailPayload);
  };

  const statusColor = (state: string) => {
    if (state === "success") return "green";
    if (state === "error") return "red";
    return "gray";
  };

  // -----------------------------
  // Preview invoice (wire this to your real route / endpoint)
  // -----------------------------
  const handlePreviewInvoice = () => {
    // Option A: navigate to a preview page
    // navigate("/invoice-preview", { state: { customer } });

    // Option B: open a backend preview endpoint (adjust path to match your API)
    if (!order?.orderId) return;
    const url = `${pb.baseUrl}/api/invoice/preview?orderId=${encodeURIComponent(
      order.orderId,
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
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

  return (
    <Box p="4" style={{ margin: "0 auto", maxWidth: 1100 }} width="100%">
      {/* Top header */}
      <Flex justify="between" align="start" mb="3" gap="3" wrap="wrap">
        <Box>
          <Button
            variant="ghost"
            size="1"
            onClick={() => navigate("/")}
            style={{ paddingLeft: 0 }}
          >
            ← Customers
          </Button>

          <Flex align="center" gap="2" mt="2" wrap="wrap">
            <Heading size="4">
              Order {order?.orderNo ?? order?.orderId ?? ""}
            </Heading>

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

          <Flex gap="2" mt="2" wrap="wrap">
            <Badge
              variant="soft"
              color={getOrderStatusColor(orderStatus) as any}
            >
              {formatSnakeCase(orderStatus)}
            </Badge>
            <Badge
              variant="soft"
              color={getPaymentStatusColor(paymentStatus) as any}
            >
              {formatSnakeCase(paymentStatus)}
            </Badge>

            {paperweight ? (
              <Badge variant="soft" color={paperweightReceived ? "green" : "gray"}>
                Paperweight {paperweightReceived ? "received" : "not received"}
              </Badge>
            ) : null}
          </Flex>
        </Box>

        <Flex gap="2" align="center" wrap="wrap" justify="end">
          <Button variant="soft" onClick={handlePreviewInvoice} disabled={!order?.orderId}>
            Preview invoice
          </Button>

          <Button
            variant="soft"
            onClick={handleSendRecommendation}
            disabled={!canSendEmails || isSendingRec}
          >
            {isSendingRec ? "Sending..." : "Send recommendation"}
          </Button>

          <Button onClick={handleSendInvoice} disabled={!canSendEmails || isSendingInv}>
            {isSendingInv ? "Sending..." : "Send invoice"}
          </Button>
        </Flex>
      </Flex>

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

      {/* Controls */}
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
            <Flex direction="column" gap="1">
              <Text size="1" color="gray">
                Order status
              </Text>
              <Select.Root
                value={orderStatus}
                onValueChange={(value) =>
                  setOrderStatus(value as OrdersOrderStatusOptions)
                }
              >
                <Select.Trigger />
                <Select.Content>
                  {ORDER_STATUS_OPTIONS.map((status) => (
                    <Select.Item key={status} value={status}>
                      {formatSnakeCase(status)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="1" color="gray">
                Payment status
              </Text>
              <Select.Root
                value={paymentStatus}
                onValueChange={(value) =>
                  setPaymentStatus(value as OrdersPaymentStatusOptions)
                }
              >
                <Select.Trigger />
                <Select.Content>
                  {ORDER_PAYMENT_STATUS_OPTIONS.map((status) => (
                    <Select.Item key={status} value={status}>
                      {formatSnakeCase(status)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>

            <Button
              size="2"
              onClick={handleSaveMeta}
              disabled={!order?.orderId || isSavingMeta}
            >
              {isSavingMeta ? "Saving..." : "Update"}
            </Button>
          </Flex>
        </Flex>

        {paperweight ? (
          <>
            <Separator my="3" size="4" />
            <Flex justify="between" align="center" wrap="wrap" gap="3">
              <Box>
                <Text size="2" weight="bold">
                  Paperweight
                </Text>
                <Text size="2" color="gray">
                  Qty {paperweight.quantity ?? 1} · {currency(paperweight.price)}
                </Text>
              </Box>

              <Flex align="center" gap="2">
                <Text size="2" color="gray">
                  Received
                </Text>
                <Switch
                  checked={paperweightReceived}
                  onCheckedChange={handleTogglePaperweightReceived}
                  disabled={!order?.orderId || isSavingPw}
                />
              </Flex>
            </Flex>
          </>
        ) : null}
      </Card>

      {/* Items list */}
      <Box mt="4">
        <Flex justify="between" align="center" mb="2" wrap="wrap" gap="2">
          <Heading size="3">Item details</Heading>
          <Text size="2" color="gray">
            {frames.length} bouquet{frames.length === 1 ? "" : "s"}
            {paperweight ? " + paperweight" : ""}
          </Text>
        </Flex>

        {frames.length === 0 && !paperweight ? (
          <Card>
            <Text size="2" color="gray">
              No items found on this order.
            </Text>
          </Card>
        ) : (
          <Flex direction="column" gap="3">
            {frames.map((frame, idx) => {
              const mountColour =
                (frame as any).mountColour ??
                (frame as any).frameMountColour ??
                null;

              const title = [
                frame.size,
                frame.frameType,
                frame.preservationType,
              ]
                .filter(Boolean)
                .join(" · ");

              const subtitle = [
                frame.glassType ? `Glass: ${frame.glassType}` : null,
                mountColour ? `Mount: ${mountColour}` : null,
              ]
                .filter(Boolean)
                .join(" · ");

              const extras = frame.frameId
                ? frameExtrasByFrameId.get(frame.frameId) ?? []
                : [];

              return (
                <Card key={frame.frameId ?? `frame-${idx}`}>
                  <Flex justify="between" align="start" gap="3" wrap="wrap">
                    <Box>
                      <Flex align="center" gap="2" wrap="wrap">
                        <Badge variant="soft" color="gray">
                          Bouquet {idx + 1}
                        </Badge>
                        <Text size="3" weight="bold">
                          {title || "Bouquet frame"}
                        </Text>
                      </Flex>

                      {subtitle ? (
                        <Text size="2" color="gray" mt="1">
                          {subtitle}
                        </Text>
                      ) : null}

                      <Text size="2" mt="2">
                        Price: <Text weight="bold">{currency(frame.price)}</Text>
                      </Text>

                      {extras.length ? (
                        <Box mt="2">
                          <Text size="2" color="gray">
                            Extras
                          </Text>
                          <Flex direction="column" gap="1" mt="1">
                            {extras.map((e) => (
                              <Flex key={e.id} justify="between" gap="3">
                                <Text size="2" color="gray">
                                  {e.description}
                                </Text>
                                <Text size="2" color="gray">
                                  {currency(e.total)}
                                </Text>
                              </Flex>
                            ))}
                          </Flex>
                        </Box>
                      ) : null}
                    </Box>

                    <Flex direction="column" align="end" gap="3">
                      <Flex align="center" gap="3" wrap="wrap">
                        <InlineToggle
                          label="Artwork complete"
                          checked={Boolean(frame.artworkComplete)}
                          onChange={(next) =>
                            handleToggleArtworkComplete(frame, next)
                          }
                          disabled={!frame.frameId || isSavingCompletion}
                        />
                        <InlineToggle
                          label="Framing complete"
                          checked={Boolean(frame.framingComplete)}
                          onChange={(next) =>
                            handleToggleFramingComplete(frame, next)
                          }
                          disabled={!frame.frameId || isSavingCompletion}
                        />
                      </Flex>

                      <Box>
                        <FrameExtrasDialog
                          frame={frame}
                          onUpdated={(patch) =>
                            handleFrameUpdated(frame.frameId, patch)
                          }
                        />
                      </Box>
                    </Flex>
                  </Flex>
                </Card>
              );
            })}
          </Flex>
        )}
      </Box>
    </Box>
  );
};

export default Order;

/* ---------- Frame extras dialog ---------- */

type FrameExtrasDialogProps = {
  frame: OrderFrame;
  onUpdated: (patch: Partial<OrderFrame>) => void;
};

const FrameExtrasDialog: FC<FrameExtrasDialogProps> = ({
  frame,
  onUpdated,
}) => {
  const queryClient = useQueryClient();

  const rawExtras = (frame.extras || {}) as {
    glassPrice?: number;
    glassEngravingPrice?: number;
    mountPrice?: number;
  };

  const [glassEngraving, setGlassEngraving] = useState(
    frame.glassEngraving ?? "",
  );
  const [glassEngravingPrice, setGlassEngravingPrice] = useState<number>(
    typeof rawExtras.glassEngravingPrice === "number"
      ? rawExtras.glassEngravingPrice
      : 0,
  );

  const [inclusions, setInclusions] =
    useState<OrderFrameItemsInclusionsOptions>(
      (frame.inclusions as OrderFrameItemsInclusionsOptions) ?? "No",
    );
  const [glassType, setGlassType] = useState<OrderFrameItemsGlassTypeOptions>(
    (frame.glassType as OrderFrameItemsGlassTypeOptions) ??
      "Clearview uv glass",
  );
  const [glassPrice, setGlassPrice] = useState<number>(
    typeof rawExtras.glassPrice === "number" ? rawExtras.glassPrice : 0,
  );

  const { mutateAsync, isPending } = useMutation({
    mutationFn: () =>
      updateBouquet({
        frameId: frame.frameId,
        glassEngraving: glassEngraving || undefined,
        inclusions,
        glassType,
        extras: {
          ...(frame.extras || {}),
          glassPrice,
          glassEngravingPrice,
        },
      }),
    onSuccess: () => {
      onUpdated({
        glassEngraving: glassEngraving || undefined,
        inclusions,
        glassType,
        extras: {
          ...(frame.extras || {}),
          glassPrice,
          glassEngravingPrice,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const handleSave = async () => {
    if (!frame.frameId) return;
    await mutateAsync();
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button size="1" variant="soft">
          Options
        </Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="560px">
        <Dialog.Title>Frame options</Dialog.Title>
        <Dialog.Description size="2" mb="3">
          Glass engraving, buttonhole and glass type for this frame.
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <Box>
            <Text size="2" weight="bold">
              Glass engraving
            </Text>
            <TextField.Root
              mt="1"
              value={glassEngraving}
              onChange={(e) => setGlassEngraving(e.target.value)}
              placeholder='e.g. "Lauren & Simon 18th March 2020"'
            />
            <Text size="1" color="gray" mt="1">
              Engraving price
            </Text>
            <TextField.Root
              type="number"
              mt="1"
              value={glassEngravingPrice.toString()}
              onChange={(e) =>
                setGlassEngravingPrice(
                  e.target.value ? Number(e.target.value) : 0,
                )
              }
              min="0"
            />
          </Box>

          <Flex gap="3" wrap="wrap">
            <Box flexGrow="1" minWidth="220px">
              <Text size="2" weight="bold">
                Inclusions
              </Text>
              <Select.Root
                value={inclusions}
                onValueChange={(value) =>
                  setInclusions(value as OrderFrameItemsInclusionsOptions)
                }
              >
                <Select.Trigger mt="1" />
                <Select.Content>
                  {INCLUSION_OPTIONS.map((opt) => (
                    <Select.Item key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Box>

            <Box flexGrow="1" minWidth="220px">
              <Text size="2" weight="bold">
                Glass type
              </Text>
              <Select.Root
                value={glassType}
                onValueChange={(value) =>
                  setGlassType(value as OrderFrameItemsGlassTypeOptions)
                }
              >
                <Select.Trigger mt="1" />
                <Select.Content>
                  {GLASS_TYPE_OPTIONS.map((opt) => (
                    <Select.Item key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>

              <Text size="1" color="gray" mt="1">
                Glass price
              </Text>
              <TextField.Root
                type="number"
                mt="1"
                value={glassPrice.toString()}
                onChange={(e) =>
                  setGlassPrice(e.target.value ? Number(e.target.value) : 0)
                }
                min="0"
              />
            </Box>
          </Flex>
        </Flex>

        <Flex justify="end" gap="2" mt="4">
          <Dialog.Close>
            <Button type="button" variant="soft">
              Cancel
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isPending || !frame.frameId}
            >
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

/* ---------- Small helper components ---------- */

type MetaProps = {
  label: string;
  value?: string | null;
  colour?: string;
};

const Meta: FC<MetaProps> = ({ label, value, colour = "gray" }) => {
  if (!value) return null;

  return (
    <Text size="1" color={colour as TextProps["color"]}>
      {label}: <Badge variant="soft">{formatSnakeCase(value)}</Badge>
    </Text>
  );
};

const InlineToggle: FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ label, checked, onChange, disabled }) => (
  <Flex align="center" gap="2">
    <Text size="2" color="gray">
      {label}
    </Text>
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
  </Flex>
);
