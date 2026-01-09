import type { FC } from "react";
import { Button, Flex, Heading } from "@radix-ui/themes";

export type OrderHeaderProps = {
  orderLabel: string;
  onBack: () => void;
  onPreviewInvoice: () => void;
  onOpenEmailActions: () => void;
  previewDisabled?: boolean;
};

const OrderHeader: FC<OrderHeaderProps> = ({
  orderLabel,
  onBack,
  onPreviewInvoice,
  onOpenEmailActions,
  previewDisabled,
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
      <Flex gap="2" align="center" wrap="wrap" justify="end">
        <Button
          variant="soft"
          onClick={onPreviewInvoice}
          disabled={previewDisabled}
        >
          Preview invoice
        </Button>
        <Button variant="soft" onClick={onOpenEmailActions}>
          Email actions
        </Button>
      </Flex>
    </Flex>
  );
};

export default OrderHeader;
