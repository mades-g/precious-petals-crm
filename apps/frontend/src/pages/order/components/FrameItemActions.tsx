import type { FC } from "react";
import { Badge, Button, Flex } from "@radix-ui/themes";

import { formatDate } from "@/utils";
import InlineToggle from "./InlineToggle";
import type { OrderFrame } from "../types";

export type FrameItemActionsProps = {
  frame: OrderFrame;
  onEdit: () => void;
  onToggleArtworkComplete: (next: boolean) => void;
  onToggleFramingComplete: (next: boolean) => void;
  isSavingCompletion: boolean;
  disabled?: boolean;
};

const FrameItemActions: FC<FrameItemActionsProps> = ({
  frame,
  onEdit,
  onToggleArtworkComplete,
  onToggleFramingComplete,
  isSavingCompletion,
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
      <InlineToggle
        label="Artwork complete"
        checked={Boolean(frame.artworkComplete)}
        onChange={onToggleArtworkComplete}
        disabled={Boolean(disabled) || !frame.frameId || isSavingCompletion}
      />
      <InlineToggle
        label="Framing complete"
        checked={Boolean(frame.framingComplete)}
        onChange={onToggleFramingComplete}
        disabled={Boolean(disabled) || !frame.frameId || isSavingCompletion}
      />
      {frame.preservationDate ? (
        <Badge variant="soft" color="blue">
          Preservation {formatDate(frame.preservationDate)}
        </Badge>
      ) : null}
    </Flex>
  );
};

export default FrameItemActions;
