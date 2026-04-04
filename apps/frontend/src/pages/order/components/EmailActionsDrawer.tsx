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

import { formatDateTime } from "@/utils";

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
  isActionDisabled?: (action: EmailActionConfig) => boolean;
  actionDisabledMessage?: (action: EmailActionConfig) => string | null;
  disabledMessage?: string;
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

const statusLabel = (status?: string) => {
  if (status === "sent") return "Sent";
  if (status === "failed") return "Failed";
  if (status === "attempted") return "Attempted";
  return "Logged";
};

const getEmailActionLabel = (log: EmailLogEntry) => {
  const emailType = log.emailType?.trim();
  const eventType = log.eventType?.trim();

  if (
    eventType === "bouquet_recommendation" ||
    emailType === "recommendation_bouquet"
  ) {
    return "Recommendation email";
  }

  if (eventType === "invoice" || emailType === "invoice") {
    return "Invoice email";
  }

  if (eventType === "delivery_collect" || emailType === "delivery_collect") {
    return "Ready for collection/delivery email";
  }

  if (emailType === "recommendation_paperweight") {
    return "Paperweight recommendation email";
  }

  if (eventType === "status_update") {
    return "Status update email";
  }

  if (eventType === "comment") {
    return "Comment email";
  }

  return "Email";
};

const getRecipientLabel = (log: EmailLogEntry) => {
  const toName = log.toName?.trim();
  const toEmail = log.toEmail?.trim();

  if (toName && toEmail) {
    return `${toName} <${toEmail}>`;
  }

  return toName || toEmail || "";
};

const looksLikePocketBaseId = (value: string) => /^[a-z0-9]{15}$/i.test(value);

const getSentByLabel = (log: EmailLogEntry) => {
  const expandedUser = log.expand?.sentBy;
  const expandedName = expandedUser?.name?.trim();
  const expandedEmail = expandedUser?.email?.trim();

  if (expandedName && expandedEmail) {
    return `${expandedName} <${expandedEmail}>`;
  }

  if (expandedName) return expandedName;
  if (expandedEmail) return expandedEmail;

  const sentBy = log.sentBy?.trim();
  if (!sentBy || looksLikePocketBaseId(sentBy)) return "";

  return sentBy;
};

const EmailActionsDrawer: FC<EmailActionsDrawerProps> = ({
  open,
  onOpenChange,
  actions,
  onSend,
  emailStatus,
  canSendEmails,
  isActionDisabled,
  actionDisabledMessage,
  disabledMessage,
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
              {disabledMessage || "You must be logged in to send emails."}
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
                const actionIsDisabled = isActionDisabled
                  ? isActionDisabled(action)
                  : false;
                const actionDisabledText = actionDisabledMessage
                  ? actionDisabledMessage(action)
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
                          disabled={actionIsDisabled}
                        />
                      ) : null}
                      {actionDisabledText ? (
                        <Text size="2" color="gray">
                          {actionDisabledText}
                        </Text>
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
                          actionIsDisabled ||
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
                {logs.map((log) => {
                  const recipientLabel = getRecipientLabel(log);
                  const sentByLabel = getSentByLabel(log);

                  return (
                    <Box
                      key={log.id}
                      style={{
                        border: "1px solid var(--gray-a5)",
                        borderRadius: 8,
                        padding: 10,
                      }}
                    >
                      <Flex align="center" justify="between" gap="2" wrap="wrap">
                        <Flex align="center" gap="2" wrap="wrap">
                          <Badge color={statusColor(log.status)} variant="soft">
                            {statusLabel(log.status)}
                          </Badge>
                          <Text size="2" weight="medium">
                            {getEmailActionLabel(log)}
                          </Text>
                        </Flex>
                        {log.sentAt ? (
                          <Text size="1" color="gray">
                            {formatDateTime(log.sentAt)}
                          </Text>
                        ) : null}
                      </Flex>
                      <Flex direction="column" gap="1" mt="1">
                        {recipientLabel ? (
                          <Text size="2" color="gray">
                            To: {recipientLabel}
                          </Text>
                        ) : null}
                        {log.subject ? (
                          <Text size="2" color="gray">
                            Subject: {log.subject}
                          </Text>
                        ) : null}
                        {log.eventNote?.trim() ? (
                          <Text size="2" color="gray">
                            Note: {log.eventNote.trim()}
                          </Text>
                        ) : null}
                        {sentByLabel ? (
                          <Text size="2" color="gray">
                            Sent by: {sentByLabel}
                          </Text>
                        ) : null}
                        {log.error ? (
                          <Text size="2" color="red">
                            Error: {log.error}
                          </Text>
                        ) : null}
                      </Flex>
                    </Box>
                  );
                })}
              </Flex>
            )}
          </Box>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default EmailActionsDrawer;
