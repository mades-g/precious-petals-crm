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

export type OrderActionsBarProps = {
  created?: string | null;
  occasionDate?: string | null;
  requiredBy?: string | null;
  orderStatus: OrdersOrderStatusOptions;
  paymentStatus: OrdersPaymentStatusOptions;
  onPreviewInvoice: () => void;
  previewDisabled?: boolean;
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
};

const OrderActionsBar: FC<OrderActionsBarProps> = ({
  created,
  occasionDate,
  requiredBy,
  orderStatus,
  paymentStatus,
  onPreviewInvoice,
  previewDisabled,
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
          </Flex>
          <Flex gap="2" align="center" wrap="wrap">
            <Button
              variant="outline"
              onClick={onPreviewInvoice}
              disabled={previewDisabled}
            >
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
