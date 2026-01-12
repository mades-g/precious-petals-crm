import { useEffect, useMemo, useState, type FC } from "react";
import {
  Box,
  Button,
  Dialog,
  Flex,
  Heading,
  Select,
  Text,
  TextField,
} from "@radix-ui/themes";

import type {
  OrdersOrderStatusOptions,
  OrdersPaymentStatusOptions,
} from "@/services/pb/types";
import { formatSnakeCase } from "@/utils";
import { exportOrdersXlsx } from "@/api/export-orders";

const PAYMENT_STATUS_OPTIONS: OrdersPaymentStatusOptions[] = [
  "waiting_first_deposit",
  "waiting_second_deposit",
  "waiting_final_balance",
  "first_deposit_paid",
  "second_deposit_paid",
  "final_balance_paid",
];

const ORDER_STATUS_OPTIONS: OrdersOrderStatusOptions[] = [
  "draft",
  "in_progress",
  "ready",
  "delivered",
  "cancelled",
];

const buildFallbackFilename = () => {
  const today = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `orders-export-${today}.xlsx`;
};

export type ExportOrdersModalProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  canExport: boolean;
};

const ExportOrdersModal: FC<ExportOrdersModalProps> = ({
  open,
  onOpenChange,
  canExport,
}) => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [orderId, setOrderId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<
    OrdersPaymentStatusOptions | "any"
  >("any");
  const [orderStatus, setOrderStatus] = useState<
    OrdersOrderStatusOptions | "any"
  >("any");
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOrderIdActive = orderId.trim().length > 0;
  const inputsDisabled = !canExport || isDownloading;

  useEffect(() => {
    if (!open) {
      setError(null);
      setIsDownloading(false);
    }
  }, [open]);

  const exportParams = useMemo(
    () => ({
      orderId: orderId.trim() || undefined,
      from: !isOrderIdActive && from ? from : undefined,
      to: !isOrderIdActive && to ? to : undefined,
      paymentStatus: paymentStatus === "any" ? undefined : paymentStatus,
      orderStatus: orderStatus === "any" ? undefined : orderStatus,
    }),
    [orderId, from, to, paymentStatus, orderStatus, isOrderIdActive],
  );

  const handleDownload = async () => {
    setError(null);
    setIsDownloading(true);
    try {
      const { blob, filename } = await exportOrdersXlsx(exportParams);
      const downloadName = filename || buildFallbackFilename();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to export orders.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 520 }}>
        <Flex direction="column" gap="3">
          <Flex justify="between" align="center">
            <Heading size="4">Export orders XLSX</Heading>
            <Dialog.Close>
              <Button variant="soft" disabled={isDownloading}>
                Close
              </Button>
            </Dialog.Close>
          </Flex>
          <Text size="2" color="gray">
            Generate a workbook with all orders and related data. If you enter
            an Order ID, the date range is ignored.
          </Text>

          {!canExport ? (
            <Text size="2" color="red">
              You must be logged in to export orders.
            </Text>
          ) : null}

          {error ? (
            <Text size="2" color="red">
              {error}
            </Text>
          ) : null}

          <Box>
            <Text size="1" color="gray">
              Order ID (optional)
            </Text>
            <TextField.Root
              placeholder="Order record ID"
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              disabled={inputsDisabled}
            />
          </Box>
          <Flex gap="3" wrap="wrap">
            <Box style={{ minWidth: 200 }}>
              <Text size="1" color="gray">
                Date from
              </Text>
              <TextField.Root
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                disabled={inputsDisabled || isOrderIdActive}
              />
            </Box>
            <Box style={{ minWidth: 200 }}>
              <Text size="1" color="gray">
                Date to
              </Text>
              <TextField.Root
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                disabled={inputsDisabled || isOrderIdActive}
              />
            </Box>
          </Flex>
          <Flex gap="3" wrap="wrap">
            <Box style={{ minWidth: 200 }}>
              <Text size="1" color="gray">
                Payment status
              </Text>
              <Select.Root
                value={paymentStatus}
                onValueChange={(value) =>
                  setPaymentStatus(
                    value as OrdersPaymentStatusOptions | "any",
                  )
                }
              >
                <Select.Trigger disabled={inputsDisabled} />
                <Select.Content>
                  <Select.Item value="any">Any status</Select.Item>
                  {PAYMENT_STATUS_OPTIONS.map((status) => (
                    <Select.Item key={status} value={status}>
                      {formatSnakeCase(status)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Box>
            <Box style={{ minWidth: 200 }}>
              <Text size="1" color="gray">
                Order status
              </Text>
              <Select.Root
                value={orderStatus}
                onValueChange={(value) =>
                  setOrderStatus(value as OrdersOrderStatusOptions | "any")
                }
              >
                <Select.Trigger disabled={inputsDisabled} />
                <Select.Content>
                  <Select.Item value="any">Any status</Select.Item>
                  {ORDER_STATUS_OPTIONS.map((status) => (
                    <Select.Item key={status} value={status}>
                      {formatSnakeCase(status)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Box>
          </Flex>
          <Flex justify="end" gap="2">
            <Button
              variant="soft"
              onClick={() => onOpenChange(false)}
              disabled={isDownloading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDownload}
              disabled={inputsDisabled}
              loading={isDownloading}
            >
              {isDownloading ? "Generating..." : "Download export"}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default ExportOrdersModal;
