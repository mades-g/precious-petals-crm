import { type FC } from "react";
import {
  Badge,
  Box,
  Button,
  Code,
  Dialog,
  Flex,
  Heading,
  Table,
  Text,
} from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";

import { getSmsLogs, type SmsLogItem } from "@/api/get-sms-logs";
import { formatDate } from "@/utils";

const statusColor = (status?: string) => {
  if (status === "sent") return "green";
  if (status === "failed") return "red";
  return "gray";
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
      <Dialog.Content style={{ width: 720, maxWidth: "95vw" }}>
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
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Sent</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>To</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Message</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {logs.map((log: SmsLogItem) => (
                  <Table.Row key={log.id}>
                    <Table.Cell>
                      {log.sentAt ? formatDate(log.sentAt) : "-"}
                    </Table.Cell>
                    <Table.Cell>
                      <Code size="1" variant="outline">
                        {log.type}
                      </Code>
                    </Table.Cell>
                    <Table.Cell>{log.toNumber}</Table.Cell>
                    <Table.Cell>
                      <Badge color={statusColor(log.status)} variant="soft">
                        {log.status}
                      </Badge>
                      {log.status === "failed" && log.error ? (
                        <Text size="1" color="red" mt="1">
                          {log.error}
                        </Text>
                      ) : null}
                    </Table.Cell>
                    <Table.Cell>
                      <Box
                        style={{
                          maxWidth: 280,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={log.body}
                      >
                        {log.body}
                      </Box>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default SmsLogDrawer;
