import type { FC } from "react";
import {
  Button,
  Card,
  DropdownMenu,
  Flex,
  Text,
} from "@radix-ui/themes";

import {
  formatDate,
  formatSnakeCase,
  getOrderStatusColor,
  getPaymentStatusColor,
} from "@/utils";
import type {
  OrdersOrderStatusOptions,
  OrdersPaymentStatusOptions,
} from "@/services/pb/types";
import { ORDER_STATUS_OPTIONS } from "@/services/pb/constants";
import type { RecommendationReminderSummary } from "../types";
import InlineToggle from "./InlineToggle";

type PillColor =
  | "gray"
  | "green"
  | "yellow"
  | "red"
  | "blue"
  | "orange"
  | "cyan";

const pillStyle = (color: PillColor) =>
  ({
    minHeight: 32,
    padding: "0 12px",
    borderRadius: 6,
    backgroundColor: `var(--${color}-a3)`,
    color: `var(--${color}-11)`,
    whiteSpace: "nowrap",
  }) as const;

const InfoPill: FC<{
  color: PillColor;
  label: string;
  value: string;
}> = ({ color, label, value }) => (
  <Flex align="center" gap="1" style={pillStyle(color)}>
    <Text size="2" weight="bold">
      {label}
    </Text>
    <Text size="2">{value}</Text>
  </Flex>
);

const pluralizeDays = (value: number) => `${value} day${value === 1 ? "" : "s"}`;

const getReminderStatusColor = (
  summary: RecommendationReminderSummary,
): PillColor => {
  switch (summary.status) {
    case "scheduled":
      return "blue";
    case "due_today":
      return "orange";
    case "overdue":
      return "red";
    case "stopped":
      return "gray";
    case "not_started":
      return "gray";
    case "not_eligible":
      return "gray";
    default:
      return "gray";
  }
};

const getReminderStatusValue = (summary: RecommendationReminderSummary) => {
  switch (summary.status) {
    case "scheduled":
      return summary.daysUntilNextReminder != null
        ? `${pluralizeDays(summary.daysUntilNextReminder)} left`
        : "Scheduled";
    case "due_today":
      return "Due today";
    case "overdue":
      return summary.daysOverdue != null
        ? `${pluralizeDays(summary.daysOverdue)} overdue`
        : "Overdue";
    case "stopped":
      return "Stopped";
    case "not_started":
      return "Not started";
    case "not_eligible":
      return "Not eligible";
    default:
      return "Unknown";
  }
};

export type OrderActionsBarProps = {
  created?: string | null;
  occasionDate?: string | null;
  requiredBy?: string | null;
  orderStatus: OrdersOrderStatusOptions;
  paymentStatus: OrdersPaymentStatusOptions;
  onPreviewInvoice: () => void;
  onOpenEmailActions: () => void;
  onOpenSms: () => void;
  onOpenSmsLogs: () => void;
  onUpdateStatus: (status: OrdersOrderStatusOptions) => void;
  isUpdatingStatus: boolean;
  isStatusDisabled: (status: OrdersOrderStatusOptions) => boolean;
  statusHelperText?: string;
  emailDisabled?: boolean;
  smsDisabled?: boolean;
  onDelete: () => void;
  isDeleting: boolean;
  showDelete: boolean;
  showCompletion?: boolean;
  showFrameCompletion?: boolean;
  showPaperweightCompletion?: boolean;
  artworkComplete?: boolean;
  framingComplete?: boolean;
  paperweightReceived?: boolean;
  onToggleArtworkComplete?: (next: boolean) => void;
  onToggleFramingComplete?: (next: boolean) => void;
  onTogglePaperweightReceived?: (next: boolean) => void;
  isSavingCompletion?: boolean;
  isSavingPaperweight?: boolean;
  recommendationReminder?: RecommendationReminderSummary | null;
};

const OrderActionsBar: FC<OrderActionsBarProps> = ({
  created,
  occasionDate,
  requiredBy,
  orderStatus,
  paymentStatus,
  onPreviewInvoice,
  onOpenEmailActions,
  onOpenSms,
  onOpenSmsLogs,
  onUpdateStatus,
  isUpdatingStatus,
  isStatusDisabled,
  statusHelperText,
  emailDisabled,
  smsDisabled,
  onDelete,
  isDeleting,
  showDelete,
  showCompletion,
  showFrameCompletion,
  showPaperweightCompletion,
  artworkComplete,
  framingComplete,
  paperweightReceived,
  onToggleArtworkComplete,
  onToggleFramingComplete,
  onTogglePaperweightReceived,
  isSavingCompletion,
  isSavingPaperweight,
  recommendationReminder,
}) => {
  const menuAction =
    (disabled: boolean | undefined, action: () => void) => (event: Event) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      action();
    };

  return (
    <Card mb="3">
      <Flex direction="column" gap="2">
        <Flex justify="between" align="center" wrap="wrap" gap="3">
          <Flex gap="2" wrap="wrap" align="center">
            {created ? (
              <InfoPill
                color="gray"
                label="Created:"
                value={formatDate(created)}
              />
            ) : null}
            {occasionDate ? (
              <InfoPill
                color="gray"
                label="Occasion:"
                value={formatDate(occasionDate)}
              />
            ) : null}
            <InfoPill
              color={getOrderStatusColor(orderStatus)}
              label="Order status:"
              value={formatSnakeCase(orderStatus)}
            />
            <InfoPill
              color={getPaymentStatusColor(paymentStatus)}
              label="Payment status:"
              value={formatSnakeCase(paymentStatus)}
            />
            {requiredBy ? (
              <InfoPill color="orange" label="Required by:" value={requiredBy} />
            ) : null}
            {recommendationReminder ? (
              <>
                <InfoPill
                  color="blue"
                  label="Reminder emails:"
                  value={`${recommendationReminder.automatedReminderCount} sent`}
                />
                <InfoPill
                  color={getReminderStatusColor(recommendationReminder)}
                  label="Reminder status:"
                  value={getReminderStatusValue(recommendationReminder)}
                />
              </>
            ) : null}
          </Flex>
          <Flex gap="2" align="center" wrap="wrap">
            <Button variant="outline" onClick={onPreviewInvoice}>
              Preview invoice
            </Button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <Button variant="solid">Actions</Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item
                  onSelect={menuAction(emailDisabled, onOpenEmailActions)}
                  disabled={Boolean(emailDisabled)}
                >
                  Email actions
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={menuAction(smsDisabled, onOpenSms)}
                  disabled={Boolean(smsDisabled)}
                >
                  Send SMS
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={menuAction(false, onOpenSmsLogs)}>
                  SMS Logs
                </DropdownMenu.Item>
                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger disabled={isUpdatingStatus}>
                    Update order status
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.SubContent>
                    {ORDER_STATUS_OPTIONS.map((status) => (
                      <DropdownMenu.Item
                        key={status}
                        onSelect={(event) => {
                          if (
                            isUpdatingStatus ||
                            status === orderStatus ||
                            isStatusDisabled(status)
                          ) {
                            event.preventDefault();
                            return;
                          }
                          onUpdateStatus(status);
                        }}
                        disabled={
                          isUpdatingStatus ||
                          status === orderStatus ||
                          isStatusDisabled(status)
                        }
                      >
                        {formatSnakeCase(status)}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.SubContent>
                </DropdownMenu.Sub>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
            {showDelete ? (
              <Button
                size="2"
                color="red"
                variant="soft"
                onClick={onDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            ) : null}
          </Flex>
        </Flex>
        {statusHelperText ? (
          <Text size="2" color="gray" weight="bold">
            {statusHelperText}
          </Text>
        ) : null}
        {recommendationReminder?.hasFailedReminderAfterLastSuccess ? (
          <Text size="2" color="red" weight="bold">
            A recommendation follow-up failed recently. The cron will retry on
            the next scheduled run.
          </Text>
        ) : recommendationReminder?.blockedReason ? (
          <Text size="2" color="gray" weight="bold">
            Recommendation follow-ups: {recommendationReminder.blockedReason}
          </Text>
        ) : recommendationReminder?.nextReminderDueDate ? (
          <Text size="2" color="gray" weight="bold">
            Next recommendation reminder due{" "}
            {formatDate(recommendationReminder.nextReminderDueDate)}.
          </Text>
        ) : null}
        {showCompletion ? (
          <Flex gap="3" align="center" wrap="wrap">
            <Text size="2" weight="bold">
              Completion:
            </Text>
            {showFrameCompletion ? (
              <>
                <InlineToggle
                  label="Artwork complete"
                  checked={Boolean(artworkComplete)}
                  onChange={(next) => onToggleArtworkComplete?.(next)}
                  disabled={isSavingCompletion}
                />
                <InlineToggle
                  label="Framing complete"
                  checked={Boolean(framingComplete)}
                  onChange={(next) => onToggleFramingComplete?.(next)}
                  disabled={isSavingCompletion}
                />
              </>
            ) : null}
            {showPaperweightCompletion ? (
              <InlineToggle
                label="Paperweight received"
                checked={Boolean(paperweightReceived)}
                onChange={(next) => onTogglePaperweightReceived?.(next)}
                disabled={isSavingPaperweight}
              />
            ) : null}
          </Flex>
        ) : null}
      </Flex>
    </Card>
  );
};

export default OrderActionsBar;
