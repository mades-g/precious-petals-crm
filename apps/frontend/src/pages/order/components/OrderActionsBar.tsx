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
  onUpdateStatus: (status: OrdersOrderStatusOptions) => void;
  isUpdatingStatus: boolean;
  isStatusDisabled: (status: OrdersOrderStatusOptions) => boolean;
  previewDisabled?: boolean;
  emailDisabled?: boolean;
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
  onUpdateStatus,
  isUpdatingStatus,
  isStatusDisabled,
  previewDisabled,
  emailDisabled,
  onDelete,
  isDeleting,
  showDelete,
}) => {
  return (
    <Card mb="3">
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
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button variant="solid">Actions</Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item
                onClick={onPreviewInvoice}
                disabled={Boolean(previewDisabled)}
              >
                Preview invoice
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={onOpenEmailActions}
                disabled={Boolean(emailDisabled)}
              >
                Email actions
              </DropdownMenu.Item>
              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger disabled={isUpdatingStatus}>
                  Update status
                </DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                  {ORDER_STATUS_OPTIONS.map((status) => (
                    <DropdownMenu.Item
                      key={status}
                      onClick={() => onUpdateStatus(status)}
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
              size="1"
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
    </Card>
  );
};

export default OrderActionsBar;
