import { fireEvent, render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { describe, expect, it, vi } from "vitest";

import OrderActionsBar, { type OrderActionsBarProps } from "./OrderActionsBar";

const defaultProps: OrderActionsBarProps = {
  orderStatus: "in_progress",
  paymentStatus: "second_deposit_paid",
  onPreviewInvoice: vi.fn(),
  onOpenEmailActions: vi.fn(),
  onOpenSms: vi.fn(),
  onOpenSmsLogs: vi.fn(),
  onUpdateStatus: vi.fn(),
  isUpdatingStatus: false,
  isStatusDisabled: () => false,
  onDelete: vi.fn(),
  isDeleting: false,
  showDelete: false,
  showCompletion: true,
  showFrameCompletion: true,
};

const bar = (props: Partial<OrderActionsBarProps> = {}) => (
  <Theme>
    <OrderActionsBar {...defaultProps} {...props} />
  </Theme>
);

describe("OrderActionsBar mount cut", () => {
  it("places an accessible Mount cut checkbox between Artwork and Framing complete", () => {
    render(bar());

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.map((checkbox) => checkbox.id)).toEqual([
      screen.getByRole("checkbox", { name: "Artwork complete" }).id,
      screen.getByRole("checkbox", { name: "Mount cut" }).id,
      screen.getByRole("checkbox", { name: "Framing complete" }).id,
    ]);
    expect(screen.getByRole("checkbox", { name: "Mount cut" })).not.toBeChecked();
  });

  it("shows saved values and supports checking and unchecking through its label", () => {
    const onToggleMountCut = vi.fn();
    const { rerender } = render(bar({ mountCut: false, onToggleMountCut }));

    fireEvent.click(screen.getByText("Mount cut"));
    expect(onToggleMountCut).toHaveBeenLastCalledWith(true);

    rerender(bar({ mountCut: true, onToggleMountCut }));
    expect(screen.getByRole("checkbox", { name: "Mount cut" })).toBeChecked();
    fireEvent.click(screen.getByText("Mount cut"));
    expect(onToggleMountCut).toHaveBeenLastCalledWith(false);
  });

  it("disables frame checkboxes together while completion saves are pending", () => {
    const onToggleMountCut = vi.fn();
    render(bar({ isSavingCompletion: true, onToggleMountCut }));

    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).toBeDisabled();
    }
    fireEvent.click(screen.getByText("Mount cut"));
    expect(onToggleMountCut).not.toHaveBeenCalled();
  });

  it("hides Mount cut for orders that contain no frames", () => {
    render(bar({ showFrameCompletion: false, showPaperweightCompletion: true }));

    expect(screen.queryByRole("checkbox", { name: "Mount cut" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Paperweight received" })).toBeInTheDocument();
  });
});
