import type { FC } from "react";
import { Badge, Button, Flex } from "@radix-ui/themes";

import { formatDate } from "@/utils";
import type { OrderFrame } from "../types";

export type FrameItemActionsProps = {
  frame: OrderFrame;
  onEdit: () => void;
  disabled?: boolean;
};

const FrameItemActions: FC<FrameItemActionsProps> = ({
  frame,
  onEdit,
  disabled,
}) => {
  return (
    <Flex direction="column" gap="2" align="start">
      <Button
        size="1"
        variant="soft"
        onClick={() => {
          if (disabled) return;
          onEdit();
        }}
        disabled={disabled}
      >
        Frame options
      </Button>
      {frame.preservationDate ? (
        <Badge variant="soft" color="blue">
          Preservation {formatDate(frame.preservationDate)}
        </Badge>
      ) : null}
    </Flex>
  );
};

export default FrameItemActions;
