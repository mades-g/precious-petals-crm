import type { FC } from "react";
import { Button, Flex } from "@radix-ui/themes";

import InlineToggle from "./InlineToggle";

export type PaperweightItemActionsProps = {
  onEdit: () => void;
  received: boolean;
  onToggleReceived: (next: boolean) => void;
  disabled?: boolean;
};

const PaperweightItemActions: FC<PaperweightItemActionsProps> = ({
  onEdit,
  received,
  onToggleReceived,
  disabled,
}) => {
  return (
    <Flex direction="column" gap="2" align="start">
      <Button size="1" variant="soft" onClick={onEdit}>
        Paperweight options
      </Button>
      <InlineToggle
        label="Received"
        checked={received}
        onChange={onToggleReceived}
        disabled={disabled}
      />
    </Flex>
  );
};

export default PaperweightItemActions;
