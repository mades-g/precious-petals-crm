import type { FC } from "react";
import { Button, Flex, Heading, Text } from "@radix-ui/themes";

export type OrderHeaderProps = {
  orderLabel: string;
  onBack: () => void;
  actionsHelperText?: string;
  customerName?: string;
};

const OrderHeader: FC<OrderHeaderProps> = ({
  orderLabel,
  onBack,
  actionsHelperText,
  customerName,
}) => {
  return (
    <Flex justify="between" align="center" mb="3" gap="3" wrap="wrap">
      <Flex direction="column" gap="1">
        <Button
          variant="ghost"
          size="1"
          onClick={onBack}
          style={{ paddingLeft: 0, width: "fit-content" }}
        >
          ← Customers
        </Button>
        <Heading size="4">Order {orderLabel}</Heading>
        {customerName ? (
          <Text
            size="4"
            weight="medium"
            style={{ color: "var(--gray-12)", lineHeight: 1.15 }}
          >
            {customerName}
          </Text>
        ) : null}
      </Flex>
      {actionsHelperText ? (
        <Text size="1" color="gray" align="right">
          {actionsHelperText}
        </Text>
      ) : null}
    </Flex>
  );
};

export default OrderHeader;
