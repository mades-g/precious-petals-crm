import { type FC, useMemo, useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Card,
  Separator,
  Table,
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
  const hasBouquetFrames = frames.length > 0;

  // --- Toggles (still local for now) ---
  const [artworkComplete, setArtworkComplete] = useState(
    frames.some((f) => f.artworkComplete),
  );
  const [framingComplete, setFramingComplete] = useState(
    frames.some((f) => f.framingComplete),
  );

  // --- Editable status fields (typed to PB enums) ---
  const [orderStatus, setOrderStatus] = useState<OrdersOrderStatusOptions>(
    order?.orderStatus ?? "draft",
  );

  const [paymentStatus, setPaymentStatus] =
    useState<OrdersPaymentStatusOptions>(
      order?.paymentStatus ?? "waiting_first_deposit",
    );

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

  // helper to update a single frame locally after dialog save
  const handleFrameUpdated = (frameId: string, patch: Partial<OrderFrame>) => {
    setFrames((prev) =>
      prev.map((f) => (f.frameId === frameId ? { ...f, ...patch } : f)),
    );
  };

  // --- Build invoice line items from your data ---
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

    // Frames + extras
    frames.forEach((frame, index) => {
      // mount colour naming can differ depending on normaliser, so support both
      const mountColour =
        (frame).mountColour ?? (frame).frameMountColour ?? null;

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

      // Base frame line
      items.push({
        id: baseId,
        description,
        qty: 1,
        unitPrice: basePrice,
        total: basePrice,
        kind: "frame",
        frame,
      });

      // Extras from JSON
      const extras = (frame.extras || {}) as {
        glassPrice?: number;
        glassEngravingPrice?: number;
        mountPrice?: number;
      };

      // Mount price as an extra line item
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

    // Paperweight as its own main item
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
  const vatRate = 0.2; // 20%
  const vatTotal = subTotal * vatRate;
  const grandTotal = subTotal + vatRate * subTotal;

  // -----------------------------
  // Email actions: send recommendation + invoice
  // Now sends FULL payload (order + customer + frames + paperweight + totals)
  // -----------------------------

  const canSendEmails = useMemo(() => {
    return !!pb.authStore.token && typeof pb.baseUrl === "string";
  }, []);

  const emailPayload = useMemo(() => {
    return {
      customer: {
        id: (customer).customerId, // depends on your normaliser
        title: (customer).title ?? undefined,
        firstName: (customer).firstName ?? "",
        surname: (customer).surname ?? "",
        email: customer.email ?? "",
        displayName: customer.displayName,
        phoneNumber: customer.phoneNumber ?? "",
      },
      order: {
        orderId: order?.orderId,
        orderNo: order?.orderNo,
        created: order?.created ? formatDate(order?.created) : "",
        occasionDate: order?.occasionDate
          ? formatDate(order?.occasionDate)
          : "",
        billingAddressLine1: (order)?.billingAddressLine1,
        billingAddressLine2: (order)?.billingAddressLine2,
        billingTown: (order)?.billingTown,
        billingCounty: (order)?.billingCounty,
        billingPostcode: (order)?.billingPostcode,
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
    // Your curl used raw token; keep that.
    // If PB expects "Bearer", change to: `Bearer ${token}`
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

  return (
    <Box p="4" style={{ margin: "0 auto" }} width="60%">
      {/* Header + back to customers */}
      <Flex justify="between" align="center" mb="3">
        <Box>
          <Button
            variant="ghost"
            size="1"
            onClick={() => navigate("/")}
            style={{ paddingLeft: 0 }}
          >
            ← Customers
          </Button>
          <Heading size="4" mt="2">
            Order / Invoice
          </Heading>
        </Box>

        <Flex gap="3" align="center">
          <Button
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

      {/* Main invoice card */}
      <Card>
        {/* Top bar: order meta + toggles */}
        <Flex justify="between" align="start" mb="4">
          <Box>
            <Heading size="3" mb="1">
              Invoice {order?.orderNo ?? order?.orderId ?? ""}
            </Heading>
            <Flex gap="3" wrap="wrap">
              <Meta
                label="Occasion date"
                value={
                  order?.occasionDate ? formatDate(order?.occasionDate) : ""
                }
              />
              <Meta
                label="Created"
                value={order?.created ? formatDate(order?.created) : ""}
              />
              <Meta
                colour={getOrderStatusColor(orderStatus)}
                label="Status"
                value={orderStatus}
              />
              <Meta
                colour={getPaymentStatusColor(paymentStatus)}
                label="Payment"
                value={paymentStatus}
              />
            </Flex>

            {/* Editable status / payment controls */}
            <Box mt="3">
              <Flex gap="3" align="center" wrap="wrap">
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
                  style={{ alignSelf: "end" }}
                >
                  {isSavingMeta ? "Saving..." : "Update status"}
                </Button>
              </Flex>
            </Box>
          </Box>

          {hasBouquetFrames ? (
            <Flex gap="4">
              <ToggleBlock
                label="Artwork complete"
                checked={artworkComplete}
                onChange={setArtworkComplete}
              />
              <ToggleBlock
                label="Framing complete"
                checked={framingComplete}
                onChange={setFramingComplete}
              />
            </Flex>
          ) : null}
        </Flex>

        <Separator size="4" />

        {/* Customer details ONLY (no From block) */}
        <Flex mt="4" gap="6" wrap="wrap" align="start">
          <Box flexGrow="1">
            <Text size="1" color="gray" mb="1">
              To
            </Text>
            <Heading size="3" mb="1">
              {customer.displayName}
            </Heading>
            <AddressBlock
              line1={order?.billingAddressLine1}
              line2={order?.billingAddressLine2}
              town={order?.billingTown}
              county={order?.billingCounty}
              postcode={order?.billingPostcode}
            />
            <Text as="p" size="2" mt="1">
              Phone: {customer.phoneNumber || "—"}
            </Text>
            <Text as="p" size="2">
              Email: {customer.email || "—"}
            </Text>
          </Box>
        </Flex>

        <Separator my="4" size="4" />

        {/* Item table */}
        <Box>
          <Heading size="3" mb="2">
            Item details
          </Heading>

          {lineItems.length === 0 ? (
            <Text size="2" color="gray">
              No items found on this order.
            </Text>
          ) : (
            <Table.Root variant="surface">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>#</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell align="center">
                    Qty
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell align="right">
                    Unit price
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell align="right">
                    Amount
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell align="right">
                    Options
                  </Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {(() => {
                  let runningIndex = 0;
                  return lineItems.map((item) => {
                    const isMain =
                      item.kind === "frame" || item.kind === "paperweight";

                    if (isMain) runningIndex += 1;
                    const indexLabel = isMain ? `Item ${runningIndex}` : "";

                    return (
                      <Table.Row key={item.id}>
                        <Table.RowHeaderCell>{indexLabel}</Table.RowHeaderCell>

                        <Table.Cell>
                          {isMain ? (
                            <Text>{item.description}</Text>
                          ) : (
                            <Box pl="4">
                              <Text size="2" color="gray">
                                {item.description}
                              </Text>
                            </Box>
                          )}
                        </Table.Cell>

                        <Table.Cell align="center">
                          {isMain ? item.qty : ""}
                        </Table.Cell>

                        <Table.Cell align="right">
                          {isMain ? currency(item.unitPrice) : ""}
                        </Table.Cell>

                        <Table.Cell align="right">
                          {currency(item.total)}
                        </Table.Cell>

                        <Table.Cell align="right">
                          {item.kind === "frame" && item.frame ? (
                            <FrameExtrasDialog
                              frame={item.frame}
                              onUpdated={(patch) =>
                                handleFrameUpdated(item.frame!.frameId, patch)
                              }
                            />
                          ) : null}
                        </Table.Cell>
                      </Table.Row>
                    );
                  });
                })()}
              </Table.Body>
            </Table.Root>
          )}
        </Box>

        {/* Totals only */}
        <Flex mt="5" justify="end">
          <Box
            minWidth="260"
            style={{
              borderRadius: 8,
              border: "1px solid var(--gray-5)",
              padding: "12px 16px",
            }}
          >
            <Flex justify="between" mb="1">
              <Text size="2">Sub total (ex VAT)</Text>
              <Text size="2">{currency(subTotal)}</Text>
            </Flex>
            <Flex justify="between" mb="1">
              <Text size="2">VAT (20%)</Text>
              <Text size="2">{currency(vatTotal)}</Text>
            </Flex>
            <Separator my="2" />
            <Flex justify="between" mb="1">
              <Text weight="bold">Total</Text>
              <Text weight="bold">{currency(grandTotal)}</Text>
            </Flex>
            <Flex justify="between" mt="2">
              <Text size="2" color="gray">
                Balance due
              </Text>
              <Text size="2">{currency(grandTotal)}</Text>
            </Flex>
          </Box>
        </Flex>
      </Card>
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
          Frame options
        </Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="520px">
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
              Price
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
            <Box flexGrow="1" minWidth="200px">
              <Text size="2" weight="bold">
                Include button hole
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

            <Box flexGrow="1" minWidth="200px">
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

type ToggleBlockProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

const ToggleBlock: FC<ToggleBlockProps> = ({ label, checked, onChange }) => (
  <Flex direction="column" align="end" gap="1">
    <Text size="1">{label}</Text>
    <Switch checked={checked} onCheckedChange={onChange} />
  </Flex>
);

type AddressBlockProps = {
  line1?: string | null;
  line2?: string | null;
  town?: string | null;
  county?: string | null;
  postcode?: string | null;
};

const AddressBlock: FC<AddressBlockProps> = ({
  line1,
  line2,
  town,
  county,
  postcode,
}) => {
  const hasAny = line1 || line2 || town || county || postcode;

  if (!hasAny) {
    return (
      <Text size="2" color="gray">
        No address on file.
      </Text>
    );
  }

  return (
    <Box>
      {line1 && <Text as="p">{line1}</Text>}
      {line2 && <Text as="p">{line2}</Text>}
      {(town || county || postcode) && (
        <Text as="p">
          {[town, county, postcode].filter(Boolean).join(", ")}
        </Text>
      )}
    </Box>
  );
};
