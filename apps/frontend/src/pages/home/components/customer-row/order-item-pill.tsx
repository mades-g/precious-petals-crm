import type { FC, ReactNode } from "react";
import { Box, Text } from "@radix-ui/themes";

type OrderItemPillTone = "neutral" | "accent";

const toneBg: Record<OrderItemPillTone, string> = {
  neutral: "var(--gray-3)",
  accent: "var(--yellow-3)",
};

export const OrderItemPill: FC<{
  title: ReactNode;
  meta?: ReactNode;
  lines?: ReactNode[];
  tone?: OrderItemPillTone;
}> = ({ title, meta, lines = [], tone = "neutral" }) => (
  <Box
    px="2"
    py="1"
    style={{
      borderRadius: 10,
      backgroundColor: toneBg[tone],
    }}
  >
    <Text as="div" size="2" weight="medium">
      {title}
    </Text>
    {meta ? (
      <Text as="div" size="1" color="gray" weight="medium">
        {meta}
      </Text>
    ) : null}
    {lines.length > 0 ? (
      <Box mt="1">
        {lines.map((line, i) => (
          <Text key={i} as="div" size="1" color="gray" weight="medium">
            {line}
          </Text>
        ))}
      </Box>
    ) : null}
  </Box>
);

export default OrderItemPill;
