import type { FC } from "react";
import { Checkbox, Flex, Text } from "@radix-ui/themes";

const InlineToggle: FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ label, checked, onChange, disabled }) => (
  <Flex align="center" gap="2">
    <Checkbox
      checked={checked}
      onCheckedChange={(value) => onChange(Boolean(value))}
      disabled={disabled}
    />
    <Text size="2" color="gray">
      {label}
    </Text>
  </Flex>
);

export default InlineToggle;
