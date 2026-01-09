import type { FC } from "react";
import {
  Badge,
  Button,
  Card,
  Flex,
  Heading,
  Select,
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
import type { StatusControl } from "../types";

export type OrderActionsBarProps = {
  created?: string | null;
  occasionDate?: string | null;
  orderStatus: OrdersOrderStatusOptions;
  paymentStatus: OrdersPaymentStatusOptions;
  statusControls: [
    StatusControl<OrdersOrderStatusOptions>,
    StatusControl<OrdersPaymentStatusOptions>,
  ];
  onSaveMeta: () => void;
  isSavingMeta: boolean;
};

const OrderActionsBar: FC<OrderActionsBarProps> = ({
  created,
  occasionDate,
  orderStatus,
  paymentStatus,
  statusControls,
  onSaveMeta,
  isSavingMeta,
}) => {
  return (
    <>
      <Card mb="3">
        <Flex justify="between" align="center" wrap="wrap" gap="3">
          <Flex gap="2" wrap="wrap">
            {created ? (
              <Badge variant="soft" color="gray">
                Created {formatDate(created)}
              </Badge>
            ) : null}
            {occasionDate ? (
              <Badge variant="soft" color="gray">
                Occasion {formatDate(occasionDate)}
              </Badge>
            ) : null}
          </Flex>
          <Flex gap="2" wrap="wrap">
            <Badge variant="soft" color={getOrderStatusColor(orderStatus)}>
              {formatSnakeCase(orderStatus)}
            </Badge>
            <Badge variant="soft" color={getPaymentStatusColor(paymentStatus)}>
              {formatSnakeCase(paymentStatus)}
            </Badge>
          </Flex>
        </Flex>
      </Card>

      <Card>
        <Flex justify="between" align="start" gap="4" wrap="wrap">
          <div>
            <Heading size="3" mb="1">
              Actions
            </Heading>
            <Text size="2" color="gray">
              Update status/payment, and manage items below.
            </Text>
          </div>
          <Flex gap="3" align="end" wrap="wrap">
            {statusControls.map((control) => (
              <Flex key={control.label} direction="column" gap="1">
                <Text size="1" color="gray">
                  {control.label}
                </Text>
                <Select.Root
                  value={control.value}
                  onValueChange={(value) =>
                    control.onChange(value as typeof control.value)
                  }
                >
                  <Select.Trigger />
                  <Select.Content>
                    {control.options.map((status) => (
                      <Select.Item key={status} value={status}>
                        {formatSnakeCase(status)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>
            ))}
            <Button size="2" onClick={onSaveMeta} disabled={isSavingMeta}>
              {isSavingMeta ? "Saving..." : "Update"}
            </Button>
          </Flex>
        </Flex>
      </Card>
    </>
  );
};

export default OrderActionsBar;
