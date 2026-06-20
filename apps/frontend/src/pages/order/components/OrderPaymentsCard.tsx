import { useMemo, useState, type FC } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  IconButton,
  Popover,
  Select,
  Table,
  Text,
  TextField,
} from "@radix-ui/themes";
import { DayPicker } from "react-day-picker";
import { enGB } from "react-day-picker/locale";

import type {
  OrderPaymentsPaymentTypeOptions,
  OrderPaymentsResponse,
} from "@/services/pb/types";
import {
  formatCurrency,
  formatDate,
  parseDateOnly,
  formatSnakeCase,
  todayDateOnly,
  toDateOnlyValue,
} from "@/utils";
import type { CreateOrderPaymentDraft } from "@/api/order-payments";

import "react-day-picker/dist/style.css";

const PAYMENT_TYPE_OPTIONS: OrderPaymentsPaymentTypeOptions[] = [
  "first_deposit",
  "second_deposit",
  "final_balance",
  "other",
];

const PAPERWEIGHT_ONLY_ARTIST_HOURS = "0.1";

const defaultPaidAt = () => todayDateOnly();

type PaymentDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  size?: "1" | "2";
  width?: string;
  allowClear?: boolean;
};

const PaymentDatePicker: FC<PaymentDatePickerProps> = ({
  value,
  onChange,
  placeholder,
  disabled,
  size = "2",
  width = "100%",
  allowClear,
}) => (
  <Flex gap="2" align="center">
    <Popover.Root>
      <Popover.Trigger>
        <Button
          type="button"
          variant="outline"
          size={size}
          disabled={disabled}
          style={{ width }}
        >
          {value ? formatDate(value) : placeholder}
        </Button>
      </Popover.Trigger>
      <Popover.Content align="start">
        <DayPicker
          locale={enGB}
          mode="single"
          selected={value ? parseDateOnly(value) : undefined}
          onSelect={(date) => onChange(date ? toDateOnlyValue(date) : "")}
        />
      </Popover.Content>
    </Popover.Root>
    {allowClear && value ? (
      <IconButton
        size={size}
        variant="ghost"
        type="button"
        onClick={() => onChange("")}
        disabled={disabled}
      >
        <Cross2Icon height="16" width="16" />
      </IconButton>
    ) : null}
  </Flex>
);

type OrderPaymentsCardProps = {
  payments: OrderPaymentsResponse[];
  isLoading: boolean;
  isError: boolean;
  isSaving: boolean;
  outstanding?: number;
  orderRequiredBy?: string | null;
  orderArtistHours?: number | null;
  isPaperweightOnly?: boolean;
  onCreate: (
    payload: CreateOrderPaymentDraft & {
      requiredBy?: string;
      artistHours?: number;
    },
  ) => Promise<unknown>;
  onUpdate: (payload: {
    id: string;
    data: CreateOrderPaymentDraft & {
      requiredBy?: string;
      artistHours?: number;
    };
  }) => Promise<unknown>;
  disabled?: boolean;
};

const OrderPaymentsCard: FC<OrderPaymentsCardProps> = ({
  payments,
  isLoading,
  isError,
  isSaving,
  outstanding,
  orderRequiredBy,
  orderArtistHours,
  isPaperweightOnly = false,
  onCreate,
  onUpdate,
  disabled,
}) => {
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] =
    useState<OrderPaymentsPaymentTypeOptions | undefined>(undefined);
  const [paidAt, setPaidAt] = useState(defaultPaidAt());
  const [notes, setNotes] = useState("");
  const [requiredBy, setRequiredBy] = useState("");
  const [artistHours, setArtistHours] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const hasOutstanding =
    typeof outstanding === "number" && Number.isFinite(outstanding);
  const roundCurrency = (value: number) =>
    Math.round((value + Number.EPSILON) * 100) / 100;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editPaymentType, setEditPaymentType] =
    useState<OrderPaymentsPaymentTypeOptions>("first_deposit");
  const [editPaidAt, setEditPaidAt] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editRequiredBy, setEditRequiredBy] = useState("");
  const [editArtistHours, setEditArtistHours] = useState("");

  const hasPayments = payments.length > 0;
  const inputsDisabled = Boolean(disabled) || isSaving;
  const outstandingLabel = useMemo(() => {
    if (typeof outstanding !== "number") return null;
    return formatCurrency(outstanding) ?? undefined;
  }, [outstanding]);

  const maxAllowedForNew = hasOutstanding
    ? roundCurrency(outstanding ?? 0)
    : null;

  const maxAllowedForEdit = (payment: OrderPaymentsResponse) => {
    if (!hasOutstanding) return null;
    return roundCurrency((outstanding ?? 0) + payment.amount);
  };

  const hasDuplicateType = (
    type: OrderPaymentsPaymentTypeOptions,
    excludeId?: string,
  ) => {
    if (type === "other") return false;
    return payments.some(
      (payment) => payment.paymentType === type && payment.id !== excludeId,
    );
  };

  const requiresNotes = (type: OrderPaymentsPaymentTypeOptions) =>
    type === "other";

  const requiresFirstDeposit = (type: OrderPaymentsPaymentTypeOptions) =>
    type === "second_deposit" || type === "final_balance";

  const requiresRequiredBy = (type: OrderPaymentsPaymentTypeOptions) =>
    type === "second_deposit";
  const requiresArtistHours = (type: OrderPaymentsPaymentTypeOptions) =>
    type === "second_deposit";

  const getDefaultArtistHours = () =>
    isPaperweightOnly && orderArtistHours == null
      ? PAPERWEIGHT_ONLY_ARTIST_HOURS
      : "";

  const isFinalBalance = (type: OrderPaymentsPaymentTypeOptions) =>
    type === "final_balance";

  const allowsZeroAmount = (type: OrderPaymentsPaymentTypeOptions) =>
    type === "second_deposit" || type === "final_balance";

  const isZeroRemaining = (remaining: number) => Math.abs(remaining) < 0.01;

  const isPaymentTypeDisabled = (
    type: OrderPaymentsPaymentTypeOptions,
    options?: {
      excludeId?: string;
      currentType?: OrderPaymentsPaymentTypeOptions;
    },
  ) => {
    if (options?.currentType === type) return false;
    if (type !== "other" && hasDuplicateType(type, options?.excludeId)) {
      return true;
    }
    if (
      requiresFirstDeposit(type) &&
      !payments.some(
        (payment) =>
          payment.paymentType === "first_deposit" &&
          payment.id !== options?.excludeId,
      )
    ) {
      return true;
    }
    return false;
  };

  const toUkDate = (value: string) => {
    if (!value || !value.includes("-")) return value;
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
  };
  const toIsoDate = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || !trimmed.includes("/")) return "";
    const [day, month, year] = trimmed.split("/");
    if (!day || !month || !year) return "";
    return `${year}-${month}-${day}`;
  };

  const handlePaymentTypeChange = (next: OrderPaymentsPaymentTypeOptions) => {
    setPaymentType(next);
    if (next !== "second_deposit") {
      setRequiredBy("");
      setArtistHours("");
      return;
    }
    if (artistHours.trim() === "") {
      setArtistHours(getDefaultArtistHours());
    }
  };

  const handleEditPaymentTypeChange = (
    next: OrderPaymentsPaymentTypeOptions,
  ) => {
    setEditPaymentType(next);
    if (next !== "second_deposit") {
      setEditRequiredBy("");
      setEditArtistHours("");
      return;
    }
    if (editArtistHours.trim() === "") {
      setEditArtistHours(getDefaultArtistHours());
    }
  };

  const handleSubmit = async () => {
    if (!paymentType) {
      setSubmitError("Select a payment type.");
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setSubmitError("Enter a valid amount.");
      return;
    }
    if (!allowsZeroAmount(paymentType) && parsedAmount === 0) {
      setSubmitError("Amount must be greater than 0 for this payment type.");
      return;
    }
    if (maxAllowedForNew != null && parsedAmount > maxAllowedForNew) {
      setSubmitError("Amount exceeds outstanding balance.");
      return;
    }
    if (hasDuplicateType(paymentType)) {
      setSubmitError("That payment type is already recorded.");
      return;
    }
    if (requiresFirstDeposit(paymentType) && isPaymentTypeDisabled(paymentType)) {
      setSubmitError(
        "Record first deposit before adding second deposit or final balance.",
      );
      return;
    }
    if (
      isFinalBalance(paymentType) &&
      maxAllowedForNew != null &&
      !isZeroRemaining(maxAllowedForNew - parsedAmount)
    ) {
      setSubmitError("Final balance must clear the remaining total.");
      return;
    }
    if (requiresNotes(paymentType) && notes.trim() === "") {
      setSubmitError("Notes are required for Other payments.");
      return;
    }
    if (requiresRequiredBy(paymentType) && requiredBy.trim() === "") {
      setSubmitError("Required by date is required for second deposits.");
      return;
    }
    if (requiresArtistHours(paymentType) && artistHours.trim() === "") {
      setSubmitError("Artist hours are required for second deposits.");
      return;
    }
    const parsedArtistHours = Number(artistHours);
    if (
      requiresArtistHours(paymentType) &&
      (Number.isNaN(parsedArtistHours) || parsedArtistHours <= 0)
    ) {
      setSubmitError("Artist hours must be greater than 0.");
      return;
    }

    setSubmitError(null);
    try {
      await onCreate({
        amount: parsedAmount,
        paymentType,
        ...(paidAt ? { paidAt } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(requiresRequiredBy(paymentType) && requiredBy.trim()
          ? { requiredBy: toUkDate(requiredBy.trim()) }
          : {}),
        ...(requiresArtistHours(paymentType)
          ? { artistHours: parsedArtistHours }
          : {}),
      });
      setAmount("");
      setPaymentType(undefined);
      setNotes("");
      setRequiredBy("");
      setArtistHours("");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save payment.",
      );
    }
  };

  const startEdit = (payment: OrderPaymentsResponse) => {
    setEditingId(payment.id);
    setEditAmount(String(payment.amount));
    setEditPaymentType(payment.paymentType);
    setEditPaidAt(payment.paidAt ?? "");
    setEditNotes(payment.notes ?? "");
    setEditRequiredBy(toIsoDate(orderRequiredBy ?? ""));
    setEditArtistHours(
      orderArtistHours != null
        ? String(orderArtistHours)
        : getDefaultArtistHours(),
    );
    setSubmitError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAmount("");
    setEditPaymentType("first_deposit");
    setEditPaidAt("");
    setEditNotes("");
    setEditRequiredBy("");
    setEditArtistHours("");
    setSubmitError(null);
  };

  const handleUpdate = async (payment: OrderPaymentsResponse) => {
    const parsedAmount = Number(editAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setSubmitError("Enter a valid amount.");
      return;
    }
    if (!allowsZeroAmount(editPaymentType) && parsedAmount === 0) {
      setSubmitError("Amount must be greater than 0 for this payment type.");
      return;
    }
    const maxAllowed = maxAllowedForEdit(payment);
    if (maxAllowed != null && parsedAmount > maxAllowed) {
      setSubmitError("Amount exceeds outstanding balance.");
      return;
    }
    if (hasDuplicateType(editPaymentType, payment.id)) {
      setSubmitError("That payment type is already recorded.");
      return;
    }
    if (
      requiresFirstDeposit(editPaymentType) &&
      editPaymentType !== payment.paymentType &&
      isPaymentTypeDisabled(editPaymentType, {
        excludeId: payment.id,
        currentType: payment.paymentType,
      })
    ) {
      setSubmitError(
        "Record first deposit before adding second deposit or final balance.",
      );
      return;
    }
    if (
      isFinalBalance(editPaymentType) &&
      maxAllowed != null &&
      !isZeroRemaining(maxAllowed - parsedAmount)
    ) {
      setSubmitError("Final balance must clear the remaining total.");
      return;
    }
    if (requiresNotes(editPaymentType) && editNotes.trim() === "") {
      setSubmitError("Notes are required for Other payments.");
      return;
    }
    if (requiresRequiredBy(editPaymentType) && editRequiredBy.trim() === "") {
      setSubmitError("Required by date is required for second deposits.");
      return;
    }
    if (requiresArtistHours(editPaymentType) && editArtistHours.trim() === "") {
      setSubmitError("Artist hours are required for second deposits.");
      return;
    }
    const parsedEditArtistHours = Number(editArtistHours);
    if (
      requiresArtistHours(editPaymentType) &&
      (Number.isNaN(parsedEditArtistHours) || parsedEditArtistHours <= 0)
    ) {
      setSubmitError("Artist hours must be greater than 0.");
      return;
    }

    setSubmitError(null);
    try {
      await onUpdate({
        id: payment.id,
        data: {
          amount: parsedAmount,
          paymentType: editPaymentType,
          ...(editPaidAt ? { paidAt: editPaidAt } : {}),
          ...(editNotes.trim() ? { notes: editNotes.trim() } : {}),
          ...(requiresRequiredBy(editPaymentType) && editRequiredBy.trim()
            ? { requiredBy: toUkDate(editRequiredBy.trim()) }
            : {}),
          ...(requiresArtistHours(editPaymentType)
            ? { artistHours: parsedEditArtistHours }
            : {}),
        },
      });
      cancelEdit();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to update payment.",
      );
    }
  };

  return (
    <Card>
      <Flex direction="column" gap="3">
        <Flex justify="between" align="center" wrap="wrap" gap="2">
          <Heading size="4">Payments</Heading>
          {outstandingLabel ? (
            <Text size="2" color="gray" weight="bold">
              Outstanding balance (incl. VAT): {outstandingLabel}
            </Text>
          ) : null}
        </Flex>

        <Flex justify="between" align="end" wrap="wrap" gap="3">
          <Flex gap="3" align="end" wrap="wrap">
            <Box style={{ minWidth: 150 }}>
              <Text size="1" color="gray">
                Amount paid
              </Text>
              <TextField.Root
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={inputsDisabled}
              />
            </Box>
            <Box style={{ minWidth: 180 }}>
              <Flex direction="column" gap="1" align="start">
                <Text size="1" color="gray">
                  Payment type
                </Text>
                <Select.Root
                  value={paymentType}
                  onValueChange={(value) => {
                    const next = value as OrderPaymentsPaymentTypeOptions;
                    handlePaymentTypeChange(next);
                  }}
                  disabled={inputsDisabled}
                >
                  <Select.Trigger
                    disabled={inputsDisabled}
                    placeholder="Select payment type"
                  />
                  <Select.Content>
                    {PAYMENT_TYPE_OPTIONS.map((option) => (
                      <Select.Item
                        key={option}
                        value={option}
                        disabled={isPaymentTypeDisabled(option)}
                      >
                        {formatSnakeCase(option)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>
            </Box>
            <Box style={{ minWidth: 150 }}>
              <Text size="1" color="gray">
                Paid date
              </Text>
              <PaymentDatePicker
                value={paidAt}
                onChange={setPaidAt}
                placeholder="Pick date"
                disabled={inputsDisabled}
                width="150px"
              />
            </Box>
            {paymentType && requiresRequiredBy(paymentType) ? (
              <Box style={{ minWidth: 170 }}>
                <Text size="1" color="gray">
                  Required by
                </Text>
                <PaymentDatePicker
                  value={requiredBy}
                  onChange={setRequiredBy}
                  placeholder="Pick date"
                  disabled={inputsDisabled}
                  width="170px"
                  allowClear
                />
              </Box>
            ) : null}
            {paymentType && requiresArtistHours(paymentType) ? (
              <Box style={{ minWidth: 160 }}>
                <Text size="1" color="gray">
                  Artist hours
                </Text>
                <TextField.Root
                  type="number"
                  min="0"
                  step="0.1"
                  value={artistHours}
                  onChange={(event) => setArtistHours(event.target.value)}
                  disabled={inputsDisabled}
                />
              </Box>
            ) : null}
            <Box style={{ minWidth: 200, maxWidth: 260 }}>
              <Text size="1" color="gray">
                Notes
              </Text>
              <TextField.Root
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={inputsDisabled}
              />
            </Box>
          </Flex>
          <Button onClick={handleSubmit} disabled={inputsDisabled}>
            {isSaving ? "Saving..." : "Add payment"}
          </Button>
        </Flex>
        {disabled ? (
          <Text size="1" color="gray">
            Payments are disabled for cancelled orders.
          </Text>
        ) : null}

        {submitError ? (
          <Text size="2" color="red">
            {submitError}
          </Text>
        ) : null}

        {isLoading ? (
          <Text size="2" color="gray">
            Loading payment history…
          </Text>
        ) : isError ? (
          <Text size="2" color="red">
            Failed to load payment history.
          </Text>
        ) : !hasPayments ? (
          <Text size="2" color="gray">
            No payments recorded yet.
          </Text>
        ) : (
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Amount</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Required by</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Artist hours</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Notes</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {payments
                .slice()
                .sort((a, b) => {
                  const order: OrderPaymentsPaymentTypeOptions[] = [
                    "first_deposit",
                    "second_deposit",
                    "other",
                    "final_balance",
                  ];
                  const aIndex = order.indexOf(a.paymentType);
                  const bIndex = order.indexOf(b.paymentType);
                  if (aIndex === bIndex) return 0;
                  if (aIndex === -1) return 1;
                  if (bIndex === -1) return -1;
                  return aIndex - bIndex;
                })
                .map((payment) => {
                  const displayDate = payment.paidAt || payment.created || "";
                  const isEditing = editingId === payment.id;
                  return (
                    <Table.Row key={payment.id}>
                      <Table.Cell>
                        {isEditing ? (
                          <PaymentDatePicker
                            value={editPaidAt}
                            onChange={setEditPaidAt}
                            placeholder="Pick date"
                            disabled={inputsDisabled}
                            size="1"
                            width="130px"
                          />
                        ) : displayDate ? (
                          formatDate(displayDate)
                        ) : (
                          ""
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {isEditing ? (
                          <Select.Root
                            value={editPaymentType}
                            onValueChange={(value) => {
                              const next =
                                value as OrderPaymentsPaymentTypeOptions;
                              handleEditPaymentTypeChange(next);
                            }}
                            disabled={inputsDisabled}
                          >
                            <Select.Trigger disabled={inputsDisabled} />
                            <Select.Content>
                              {PAYMENT_TYPE_OPTIONS.map((option) => (
                                <Select.Item
                                  key={option}
                                  value={option}
                                  disabled={isPaymentTypeDisabled(option, {
                                    excludeId: payment.id,
                                    currentType: payment.paymentType,
                                  })}
                                >
                                  {formatSnakeCase(option)}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        ) : (
                          formatSnakeCase(payment.paymentType)
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {isEditing ? (
                          <TextField.Root
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            value={editAmount}
                            onChange={(event) =>
                              setEditAmount(event.target.value)
                            }
                            disabled={inputsDisabled}
                          />
                        ) : (
                          (formatCurrency(payment.amount) ?? payment.amount)
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {isEditing && requiresRequiredBy(editPaymentType) ? (
                          <PaymentDatePicker
                            value={editRequiredBy}
                            onChange={setEditRequiredBy}
                            placeholder="Pick date"
                            disabled={inputsDisabled}
                            size="1"
                            width="130px"
                            allowClear
                          />
                        ) : payment.paymentType === "second_deposit" &&
                          orderRequiredBy ? (
                          orderRequiredBy
                        ) : (
                          ""
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {isEditing && requiresArtistHours(editPaymentType) ? (
                          <TextField.Root
                            type="number"
                            min="0"
                            step="0.1"
                            value={editArtistHours}
                            onChange={(event) =>
                              setEditArtistHours(event.target.value)
                            }
                            disabled={inputsDisabled}
                          />
                        ) : payment.paymentType === "second_deposit" ? (
                          orderArtistHours != null ? (
                            String(orderArtistHours)
                          ) : (
                            ""
                          )
                        ) : (
                          ""
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {isEditing ? (
                          <TextField.Root
                            value={editNotes}
                            onChange={(event) =>
                              setEditNotes(event.target.value)
                            }
                            disabled={inputsDisabled}
                          />
                        ) : (
                          (payment.notes ?? "")
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {isEditing ? (
                          <Flex gap="2">
                            <Button
                              size="1"
                              onClick={() => handleUpdate(payment)}
                              disabled={inputsDisabled}
                            >
                              Save
                            </Button>
                            <Button
                              size="1"
                              variant="soft"
                              onClick={cancelEdit}
                              disabled={inputsDisabled}
                            >
                              Cancel
                            </Button>
                          </Flex>
                        ) : (
                          <Button
                            size="1"
                            variant="soft"
                            onClick={() => startEdit(payment)}
                            disabled={inputsDisabled}
                          >
                            Edit
                          </Button>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
            </Table.Body>
          </Table.Root>
        )}
      </Flex>
    </Card>
  );
};

export default OrderPaymentsCard;
