import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import type { ComponentProps } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { OrderPaymentsResponse, OrderPaymentsPaymentTypeOptions } from "@/services/pb/types";
import { formatDate } from "@/utils";
import OrderPaymentsCard from "./OrderPaymentsCard";

type CardProps = ComponentProps<typeof OrderPaymentsCard>;

const payment = (
  paymentType: OrderPaymentsPaymentTypeOptions,
  amount = 100,
): OrderPaymentsResponse => ({
  id: paymentType,
  paymentType,
  amount,
  orderId: "order-1",
  paidAt: "2026-10-10",
  notes: "",
} as OrderPaymentsResponse);

const renderCard = (overrides: Partial<CardProps> = {}) => {
  const props: CardProps = {
    payments: [payment("first_deposit")],
    outstanding: 900,
    isLoading: false,
    isError: false,
    isSaving: false,
    onCreate: vi.fn().mockResolvedValue(undefined),
    onUpdate: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(<Theme><OrderPaymentsCard {...props} /></Theme>);
  return props;
};

beforeAll(() => {
  // Radix Select scrolls the focused option into view; jsdom has no layout.
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

afterAll(() => vi.unstubAllGlobals());

const selectPaymentType = async (name: string) => {
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Payment type" }), {
    key: "ArrowDown",
  });
  fireEvent.click(await screen.findByRole("option", { name }));
};

const chooseDate = async (label: string) => {
  fireEvent.click(screen.getByRole("button", { name: label }));
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() === 15 ? 16 : 15, 12);
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(date);
  fireEvent.click(await screen.findByRole("button", { name: new RegExp(dateLabel) }));
  return formatDate(date);
};

const finalRow = () => screen.getByRole("row", { name: /Final balance/ });
const addPayment = () => fireEvent.click(screen.getByRole("button", { name: "Add payment" }));

describe("OrderPaymentsCard confirmation on final balance", () => {
  it("collects required by and artist hours when the second deposit is skipped", async () => {
    const props = renderCard();
    await selectPaymentType("Final balance");
    fireEvent.change(screen.getByRole("spinbutton", { name: "Amount paid" }), { target: { value: "900" } });
    addPayment();
    expect(screen.getByText(/Required by date is required/)).toBeInTheDocument();
    expect(props.onCreate).not.toHaveBeenCalled();

    const requiredBy = await chooseDate("Required by");
    addPayment();
    expect(screen.getByText(/Artist hours are required/)).toBeInTheDocument();
    expect(props.onCreate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole("spinbutton", { name: "Artist hours" }), { target: { value: "3.5" } });
    addPayment();
    await waitFor(() => expect(props.onCreate).toHaveBeenCalledExactlyOnceWith({
      amount: 900,
      paymentType: "final_balance",
      paidAt: expect.any(String),
      requiredBy,
      artistHours: 3.5,
    }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Payment type" })).toHaveTextContent("Select payment type"));
  });

  it.each([0, Infinity])("rejects non-positive or non-finite artist hours %s", async (artistHours) => {
    const props = renderCard({ orderRequiredBy: "20/11/2026", orderArtistHours: artistHours });
    await selectPaymentType("Final balance");
    fireEvent.change(screen.getByRole("spinbutton", { name: "Amount paid" }), { target: { value: "900" } });
    addPayment();

    expect(screen.getByText("Artist hours must be a finite number greater than 0.")).toBeInTheDocument();
    expect(props.onCreate).not.toHaveBeenCalled();
  });

  it("does not accept an invalid stored required by date", async () => {
    const props = renderCard({ orderRequiredBy: "31/02/2026", orderArtistHours: 3 });
    await selectPaymentType("Final balance");
    fireEvent.change(screen.getByRole("spinbutton", { name: "Amount paid" }), { target: { value: "900" } });
    expect(screen.getByRole("button", { name: "Required by" })).toHaveTextContent("Pick date");
    addPayment();

    expect(screen.getByText(/Required by date is required/)).toBeInTheDocument();
    expect(props.onCreate).not.toHaveBeenCalled();
  });

  it("prefills the saved confirmation details for a normal final payment", async () => {
    const props = renderCard({
      payments: [payment("first_deposit"), payment("second_deposit", 250)],
      outstanding: 650,
      orderRequiredBy: "20/11/2026",
      orderArtistHours: 4.5,
    });
    await selectPaymentType("Final balance");
    expect(screen.getByRole("button", { name: "Required by" })).toHaveTextContent("20/11/2026");
    expect(screen.getByRole("spinbutton", { name: "Artist hours" })).toHaveValue(4.5);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Amount paid" }), { target: { value: "650" } });
    addPayment();

    await waitFor(() => expect(props.onCreate).toHaveBeenCalledWith(expect.objectContaining({
      paymentType: "final_balance", amount: 650, requiredBy: "20/11/2026", artistHours: 4.5,
    })));
  });

  it("keeps second deposit confirmation and the paperweight artist-hours default", async () => {
    const props = renderCard({ isPaperweightOnly: true, orderRequiredBy: "2026-11-20" });
    await selectPaymentType("Second deposit");
    expect(screen.getByRole("button", { name: "Required by" })).toHaveTextContent("20/11/2026");
    expect(screen.getByRole("spinbutton", { name: "Artist hours" })).toHaveValue(0.1);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Amount paid" }), { target: { value: "250" } });
    addPayment();

    await waitFor(() => expect(props.onCreate).toHaveBeenCalledWith(expect.objectContaining({
      paymentType: "second_deposit", amount: 250, requiredBy: "20/11/2026", artistHours: 0.1,
    })));
  });

  it("can repair a legacy final payment by filling its missing confirmation details", async () => {
    const props = renderCard({ payments: [payment("final_balance", 900)], outstanding: 0 });
    fireEvent.click(within(finalRow()).getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText(/Required by date is required/)).toBeInTheDocument();

    const requiredBy = await chooseDate("Edit required by");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText(/Artist hours are required/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Edit artist hours" }), { target: { value: "2.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(props.onUpdate).toHaveBeenCalledExactlyOnceWith({
      id: "final_balance",
      data: { amount: 900, paymentType: "final_balance", paidAt: "2026-10-10", requiredBy, artistHours: 2.5 },
    }));
  });

  it.each([0, Infinity])("rejects invalid artist hours %s when editing a final payment", (artistHours) => {
    const props = renderCard({
      payments: [payment("final_balance", 900)], outstanding: 0,
      orderRequiredBy: "20/11/2026", orderArtistHours: artistHours,
    });
    fireEvent.click(within(finalRow()).getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Artist hours must be a finite number greater than 0.")).toBeInTheDocument();
    expect(props.onUpdate).not.toHaveBeenCalled();
  });

  it.each([false, true])("shows confirmation details in the correct history row with second deposit %s", (hasSecond) => {
    renderCard({
      payments: [payment("first_deposit"), ...(hasSecond ? [payment("second_deposit", 250)] : []), payment("final_balance", 650)],
      outstanding: 0, orderRequiredBy: "20/11/2026", orderArtistHours: 4.5,
    });
    const confirmationRow = hasSecond
      ? screen.getByRole("row", { name: /Second deposit/ })
      : finalRow();
    expect(within(confirmationRow).getByRole("cell", { name: "20/11/2026" })).toBeInTheDocument();
    expect(within(confirmationRow).getByRole("cell", { name: "4.5" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(hasSecond ? 4 : 3);
    if (hasSecond) expect(within(finalRow()).queryByText("20/11/2026")).not.toBeInTheDocument();
  });

  it.each(["first_deposit", "other"] as const)("does not require confirmation details for %s", async (paymentType) => {
    const props = renderCard({ payments: [] });
    await selectPaymentType(paymentType === "first_deposit" ? "First deposit" : "Other");
    expect(screen.queryByRole("button", { name: "Required by" })).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton", { name: "Artist hours" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Amount paid" }), { target: { value: "100" } });
    if (paymentType === "other") fireEvent.change(screen.getByRole("textbox", { name: "Notes" }), { target: { value: "Additional payment" } });
    addPayment();

    await waitFor(() => expect(props.onCreate).toHaveBeenCalledWith(expect.objectContaining({ paymentType, amount: 100 })));
    expect(vi.mocked(props.onCreate).mock.calls[0][0]).not.toHaveProperty("requiredBy");
    expect(vi.mocked(props.onCreate).mock.calls[0][0]).not.toHaveProperty("artistHours");
  });
});
