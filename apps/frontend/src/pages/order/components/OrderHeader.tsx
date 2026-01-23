import type { FC } from "react";
import { Button, Flex, Heading, Text } from "@radix-ui/themes";

export type OrderHeaderProps = {
  orderLabel: string;
  onBack: () => void;
  actionsHelperText?: string;
};

const OrderHeader: FC<OrderHeaderProps> = ({
  orderLabel,
  onBack,
  actionsHelperText,
}) => {
  return (
    <Flex justify="between" align="center" mb="3" gap="3" wrap="wrap">
      <Flex direction="column" gap="1">
        <Button
          variant="ghost"
          size="1"
          onClick={onBack}
          style={{ paddingLeft: 0 }}
        >
          ← Customers
        </Button>
        <Heading size="4">Order {orderLabel}</Heading>
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
