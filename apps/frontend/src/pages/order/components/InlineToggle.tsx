import { useId, type FC } from "react";
import { Checkbox, Flex, Text } from "@radix-ui/themes";

const InlineToggle: FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ label, checked, onChange, disabled }) => {
  const id = useId();

  return (
    <Flex align="center" gap="2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onChange(Boolean(value))}
        disabled={disabled}
      />
      <Text as="label" htmlFor={id} size="2" color="gray">
        {label}
      </Text>
    </Flex>
  );
};

export default InlineToggle;
