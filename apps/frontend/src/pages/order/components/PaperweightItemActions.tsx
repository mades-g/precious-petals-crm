import type { FC } from "react";
import { Button } from "@radix-ui/themes";

export type PaperweightItemActionsProps = {
  onEdit: () => void;
  disabled?: boolean;
};

const PaperweightItemActions: FC<PaperweightItemActionsProps> = ({
  onEdit,
  disabled,
}) => {
  return (
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
      Paperweight options
    </Button>
  );
};

export default PaperweightItemActions;
