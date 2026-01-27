import type { FC } from "react";
import {
  Badge,
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
              <Badge variant="soft" color="gray">
                <Text weight="bold">Created:</Text> {formatDate(created)}
              </Badge>
            ) : null}
            {occasionDate ? (
              <Badge variant="soft" color="gray">
                <Text weight="bold">Occasion:</Text> {formatDate(occasionDate)}
              </Badge>
            ) : null}
            {requiredBy ? (
              <Badge variant="soft" color="orange">
                <Text weight="bold">Required by:</Text> {requiredBy}
              </Badge>
            ) : null}
          </Flex>
          <Flex gap="2" align="center" wrap="wrap">
            <Badge variant="soft" color={getOrderStatusColor(orderStatus)}>
              <Text weight="bold">Order status:</Text>{" "}
              {formatSnakeCase(orderStatus)}
            </Badge>
            <Badge variant="soft" color={getPaymentStatusColor(paymentStatus)}>
              <Text weight="bold">Payment status:</Text>{" "}
              {formatSnakeCase(paymentStatus)}
            </Badge>
            <Button variant="soft" onClick={onPreviewInvoice}>
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
      </Flex>
    </Card>
  );
};

export default OrderActionsBar;
