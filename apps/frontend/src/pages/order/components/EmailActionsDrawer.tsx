import { useState, type FC } from "react";
import {
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  Heading,
  Separator,
  Text,
  TextArea,
} from "@radix-ui/themes";

import type {
  EmailActionConfig,
  EmailActionStatus,
  EmailLogEntry,
} from "../types";

export type EmailActionsDrawerProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  actions: EmailActionConfig[];
  onSend: (action: EmailActionConfig, note?: string) => Promise<void> | void;
  emailStatus: EmailActionStatus | null;
  canSendEmails: boolean;
  logs: EmailLogEntry[];
  isLoadingLogs: boolean;
  isLogsError: boolean;
};

const statusColor = (status?: string) => {
  if (status === "sent") return "green";
  if (status === "failed") return "red";
  if (status === "attempted") return "yellow";
  return "gray";
};

const EmailActionsDrawer: FC<EmailActionsDrawerProps> = ({
  open,
  onOpenChange,
  actions,
  onSend,
  emailStatus,
  canSendEmails,
  logs,
  isLoadingLogs,
  isLogsError,
}) => {
  const [notes, setNotes] = useState<Record<string, string>>({});

  const updateNote = (key: string, value: string) => {
    setNotes((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        style={{
          width: 420,
          maxWidth: "92vw",
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          borderRadius: 0,
          overflow: "auto",
        }}
      >
        <Flex direction="column" gap="3">
          <Flex align="center" justify="between">
            <Heading size="4">Email actions</Heading>
            <Dialog.Close>
              <Button variant="soft">Close</Button>
            </Dialog.Close>
          </Flex>

          {!canSendEmails ? (
            <Text size="2" color="red">
              You must be logged in to send emails.
            </Text>
          ) : null}

          <Box>
            <Heading size="3" mb="2">
              Send email
            </Heading>
            <Flex direction="column" gap="3">
              {actions.map((action) => {
                const actionNote = notes[action.key] ?? "";
                const actionStatus =
                  emailStatus && emailStatus.actionKey === action.key
                    ? emailStatus
                    : null;

                return (
                  <Box
                    key={action.key}
                    style={{
                      border: "1px solid var(--gray-a5)",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <Flex direction="column" gap="2">
                      <Text size="2" weight="medium">
                        {action.label}
                      </Text>
                      <Text size="2" color="gray">
                        {action.description}
                      </Text>
                      {action.requiresNote ? (
                        <TextArea
                          placeholder={action.noteLabel || "Add a note"}
                          value={actionNote}
                          onChange={(event) =>
                            updateNote(action.key, event.target.value)
                          }
                          resize="vertical"
                        />
                      ) : null}
                      {actionStatus ? (
                        <Text
                          size="2"
                          color={
                            actionStatus.state === "error" ? "red" : "gray"
                          }
                        >
                          {actionStatus.message ||
                            (actionStatus.state === "sending"
                              ? "Sending..."
                              : "")}
                        </Text>
                      ) : null}
                      <Button
                        size="2"
                        disabled={
                          !canSendEmails ||
                          (action.requiresNote &&
                            actionNote.trim().length === 0)
                        }
                        onClick={() => onSend(action, actionNote)}
                      >
                        Send
                      </Button>
                    </Flex>
                  </Box>
                );
              })}
            </Flex>
          </Box>

          <Separator size="4" />

          <Box>
            <Heading size="3" mb="2">
              Email history
            </Heading>
            {isLoadingLogs ? (
              <Text size="2" color="gray">
                Loading history...
              </Text>
            ) : isLogsError ? (
              <Text size="2" color="red">
                Failed to load email history.
              </Text>
            ) : logs.length === 0 ? (
              <Text size="2" color="gray">
                No emails logged yet.
              </Text>
            ) : (
              <Flex direction="column" gap="2">
                {logs.map((log) => (
                  <Box
                    key={log.id}
                    style={{
                      border: "1px solid var(--gray-a5)",
                      borderRadius: 8,
                      padding: 10,
                    }}
                  >
                    <Flex align="center" gap="2" wrap="wrap">
                      <Badge color={statusColor(log.status)} variant="soft">
                        {log.status ?? "unknown"}
                      </Badge>
                      <Text size="2">
                        {log.emailType || "email"}
                        {log.eventType ? ` / ${log.eventType}` : ""}
                      </Text>
                    </Flex>
                    {log.subject ? (
                      <Text size="2" color="gray">
                        Subject: {log.subject}
                      </Text>
                    ) : null}
                    {log.sentAt ? (
                      <Text size="2" color="gray">
                        Sent: {log.sentAt}
                      </Text>
                    ) : null}
                    {log.sentBy ? (
                      <Text size="2" color="gray">
                        By: {log.sentBy}
                      </Text>
                    ) : null}
                    {log.error ? (
                      <Text size="2" color="red">
                        Error: {log.error}
                      </Text>
                    ) : null}
                  </Box>
                ))}
              </Flex>
            )}
          </Box>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default EmailActionsDrawer;
