import type { FC } from "react";
import { Button, Flex, Heading, Text } from "@radix-ui/themes";

export type OrderHeaderProps = {
  orderLabel: string;
  onBack: () => void;
  onPreviewInvoice: () => void;
  onOpenEmailActions: () => void;
  previewDisabled?: boolean;
  emailDisabled?: boolean;
  actionsHelperText?: string;
};

const OrderHeader: FC<OrderHeaderProps> = ({
  orderLabel,
  onBack,
  onPreviewInvoice,
  onOpenEmailActions,
  previewDisabled,
  emailDisabled,
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
      <Flex direction="column" gap="1" align="end">
        <Flex gap="2" align="center" wrap="wrap" justify="end">
          <Button
            variant="soft"
            onClick={onPreviewInvoice}
            disabled={previewDisabled}
          >
            Preview invoice
          </Button>
          <Button
            variant="soft"
            onClick={onOpenEmailActions}
            disabled={emailDisabled}
          >
            Email actions
          </Button>
        </Flex>
        {actionsHelperText ? (
          <Text size="1" color="gray">
            {actionsHelperText}
          </Text>
        ) : null}
      </Flex>
    </Flex>
  );
};

export default OrderHeader;
