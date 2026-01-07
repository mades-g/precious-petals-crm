import type { FC } from "react";
import { Box, Text } from "@radix-ui/themes";

import type { NormalisedCustomer } from "@/api/get-customers";
import { formatCurrency } from "@/utils";

type OrderDetails = NonNullable<NormalisedCustomer["orderDetails"]>;
type PaperweightOrder = NonNullable<OrderDetails["paperWeightOrder"]>;

export const PaperweightDetailsCell: FC<{
  paperweight: PaperweightOrder;
}> = ({ paperweight }) => {
  const { quantity, price, paperweightReceived } = paperweight;

  const qtyLabel =
    quantity === 1 ? "1 paperweight" : `${quantity} paperweights`;

  // Make meta line consistent with frame meta style
  const meta = [
    formatCurrency(price),
    typeof paperweightReceived === "boolean"
      ? `Received: ${paperweightReceived ? "Yes" : "No"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Box
      px="2"
      py="1"
      style={{
        borderRadius: 10,
        backgroundColor: "var(--yellow-3)",
      }}
    >
      <Text as="div" size="2" weight="medium">
        {qtyLabel}
      </Text>

      {meta && (
        <Text as="div" size="1" color="gray" weight="medium">
          {meta}
        </Text>
      )}
    </Box>
  );
};

export default PaperweightDetailsCell;
