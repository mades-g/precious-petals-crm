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
    <Flex direction="column" gap="2" align="start" style={{ width: "100%" }}>
      <Flex width="100%" justify="end">
        <Button
          size="2"
          variant="solid"
          onClick={() => {
            if (disabled) return;
            onEdit();
          }}
          disabled={disabled}
          style={{ minWidth: 170, justifyContent: "center" }}
        >
          Frame options
        </Button>
      </Flex>
      {frame.layout ? (
        <Badge variant="soft" color="cyan">
          Layout: {frame.layout}
        </Badge>
      ) : null}
      {frame.preservationType ? (
        <Badge variant="soft" color="teal">
          Type: {frame.preservationType}
        </Badge>
      ) : null}
      {frame.preservationDate ? (
        <Badge variant="soft" color="blue">
          Preservation {formatDate(frame.preservationDate)}
        </Badge>
      ) : null}
    </Flex>
  );
};

export default FrameItemActions;
