// src/pages/Order.tsx
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
} from "@/services/pb/types";
import {
  formatDate,
  formatSnakeCase,
  getOrderStatusColor,
  getPaymentStatusColor,
} from "@/utils";

type LocationState = {
  customer: NormalisedCustomer;
};

const currency = (value?: number | null) =>
  typeof value === "number" ? `£${value.toFixed(2)}` : "£0.00";

const Order: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { customer } = location.state as LocationState;

  const order = customer.orderDetails;
  const frames = order?.frameOrder ?? [];
  const paperweight = order?.paperWeightOrder ?? null;

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
      order?.paymentStatus ?? "wainting_first_deposit",
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

  // --- Build invoice line items from your data ---
  type LineItem = {
    id: string;
    description: string;
    qty: number;
    unitPrice: number;
    total: number;
  };

  const lineItems: LineItem[] = useMemo(() => {
    const items: LineItem[] = [];

    // Frames
    frames.forEach((frame, index) => {
      const descParts = [
        `Frame ${index + 1}`,
        frame.size,
        frame.frameType,
        frame.glassType,
      ].filter(Boolean);

      const description = descParts.join(", ");
      const price = typeof frame.price === "number" ? frame.price : 0;

      items.push({
        id: frame.frameId ?? `frame-${index}`,
        description,
        qty: 1,
        unitPrice: price,
        total: price,
      });

      // extras mapping goes here if needed later
    });

    // Paperweight
    if (paperweight) {
      const total =
        typeof paperweight.price === "number" ? paperweight.price : 0;
      const qty =
        paperweight.quantity != null ? Number(paperweight.quantity) : 1;

      items.push({
        id: paperweight.paperWeightId ?? "paperweight",
        description: "Paperweight",
        qty,
        // assuming price stored is total; if it's per unit, change to total / qty
        unitPrice: qty ? total / qty : total,
        total,
      });
    }

    return items;
  }, [frames, paperweight]);

  const subTotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const vatRate = 0.2; // 20%
  const vatTotal = subTotal * vatRate;
  const grandTotal = subTotal + vatTotal;

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
          <Text size="1" color="gray">
            {order?.orderNo ? `Order ${order.orderNo}` : "Order"}
          </Text>
        </Box>

        <Flex gap="3">
          <Button>Generate Invoice</Button>
        </Flex>
      </Flex>

      {/* Main invoice card */}
      <Card>
        {/* Top bar: order meta + toggles */}
        <Flex justify="between" align="start" mb="4">
          <Box>
            <Text size="1" color="gray">
              Document
            </Text>
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
                  size="1"
                  onClick={handleSaveMeta}
                  disabled={!order?.orderId || isSavingMeta}
                >
                  {isSavingMeta ? "Saving..." : "Update status"}
                </Button>
              </Flex>
            </Box>
          </Box>

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
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {lineItems.map((item, index) => (
                  <Table.Row key={item.id}>
                    <Table.RowHeaderCell>
                      {String(index + 1).padStart(2, "0")}
                    </Table.RowHeaderCell>
                    <Table.Cell>{item.description}</Table.Cell>
                    <Table.Cell align="center">{item.qty}</Table.Cell>
                    <Table.Cell align="right">
                      {currency(item.unitPrice)}
                    </Table.Cell>
                    <Table.Cell align="right">
                      {currency(item.total)}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>

        {/* Totals only (bank + notes removed) */}
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

/* ---------- Small helper components ---------- */

type MetaProps = {
  label: string;
  value?: string | null;
  colour?: string;
};

const Meta: FC<MetaProps> = ({ label, value, colour = "gray" }) => {
  if (!value) {
    return null;
  }
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
