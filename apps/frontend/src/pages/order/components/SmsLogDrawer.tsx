import { type FC } from "react";
import {
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  Heading,
  Separator,
  Text,
} from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";

import { getSmsLogs, type SmsLogItem } from "@/api/get-sms-logs";
import { formatDateTime, formatSnakeCase } from "@/utils";

const statusColor = (status?: string) => {
  if (status === "sent") return "green";
  if (status === "failed") return "red";
  return "gray";
};

const statusLabel = (status?: string) => {
  if (status === "sent") return "Sent";
  if (status === "failed") return "Failed";
  return "Logged";
};

const smsTypeLabel = (type?: string) => {
  switch (type) {
    case "chase_to_choose":
      return "Chase to choose";
    case "order_ready":
      return "Order ready";
    case "invite_to_pay_final_balance":
      return "Invite to pay final balance";
    case "custom":
      return "Custom message";
    case "deposit_reminder":
      return "Deposit reminder";
    case "paperweight_received":
      return "Paperweight received";
    case "framing_complete":
      return "Framing complete";
    default:
      return formatSnakeCase(type);
  }
};

export type SmsLogDrawerProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  order: { id: string; orderNo?: number | null };
};

const SmsLogDrawer: FC<SmsLogDrawerProps> = ({ open, onOpenChange, order }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["sms_logs", order.id],
    queryFn: () => getSmsLogs(order.id),
    enabled: open,
    staleTime: 15000,
  });

  const logs = data ?? [];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ width: 760, maxWidth: "95vw" }}>
        <Flex direction="column" gap="3">
          <Flex align="center" justify="between">
            <Heading size="4">
              SMS Logs{order.orderNo ? ` · Order ${order.orderNo}` : ""}
            </Heading>
            <Dialog.Close>
              <Button variant="soft">Close</Button>
            </Dialog.Close>
          </Flex>

          {isLoading ? (
            <Text size="2" color="gray">
              Loading…
            </Text>
          ) : isError ? (
            <Text size="2" color="red">
              Failed to load SMS logs.
            </Text>
          ) : logs.length === 0 ? (
            <Text size="2" color="gray">
              No SMS sent for this order yet.
            </Text>
          ) : (
            <Flex direction="column" gap="2">
              {logs.map((log: SmsLogItem) => (
                <Box
                  key={log.id}
                  style={{
                    border: "1px solid var(--gray-a5)",
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <Flex align="center" justify="between" gap="2" wrap="wrap">
                    <Flex align="center" gap="2" wrap="wrap">
                      <Badge color={statusColor(log.status)} variant="soft">
                        {statusLabel(log.status)}
                      </Badge>
                      <Text size="2" weight="medium">
                        {smsTypeLabel(log.type)}
                      </Text>
                    </Flex>
                    <Text size="1" color="gray">
                      {log.sentAt ? formatDateTime(log.sentAt) : "-"}
                    </Text>
                  </Flex>

                  <Flex direction="column" gap="1" mt="2">
                    <Text size="2" color="gray">
                      To: {log.toNumber}
                    </Text>
                    <Text size="2" color="gray">
                      Sender: {log.sender}
                    </Text>
                    {log.error ? (
                      <Text size="2" color="red">
                        Error: {log.error}
                      </Text>
                    ) : null}
                  </Flex>

                  <Separator size="4" my="2" />

                  <Box>
                    <Text size="1" color="gray">
                      Message
                    </Text>
                    <Box
                      mt="1"
                      style={{
                        background: "var(--gray-a2)",
                        borderRadius: 8,
                        padding: "10px 12px",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.5,
                      }}
                    >
                      <Text size="2">{log.body}</Text>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Flex>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default SmsLogDrawer;
