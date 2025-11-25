import type { FC } from "react"
import { Flex, Text } from "@radix-ui/themes"

type RowProps = {
  label: string
  children: React.ReactNode
}

const ReviewDataRow: FC<RowProps> = ({ label, children }) => (
  <Flex justify="between" align="start" gap="3">
    <Text size="1" color="gray">
      {label}
    </Text>
    <Text size="2" style={{ textAlign: "right" }}>
      {children || "—"}
    </Text>
  </Flex>
)

export default ReviewDataRow
