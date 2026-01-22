import { useMemo, useState, type FC } from "react";
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Select,
  Table,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";

import type {
  OrderPaymentsPaymentTypeOptions,
  OrderPaymentsResponse,
} from "@/services/pb/types";
import { formatCurrency, formatDate, formatSnakeCase } from "@/utils";
import type { CreateOrderPaymentDraft } from "@/api/order-payments";

const PAYMENT_TYPE_OPTIONS: OrderPaymentsPaymentTypeOptions[] = [
  "first_deposit",
  "second_deposit",
  "final_balance",
  "other",
];

const defaultPaidAt = () => new Date().toISOString().slice(0, 10);

type OrderPaymentsCardProps = {
  payments: OrderPaymentsResponse[];
  isLoading: boolean;
  isError: boolean;
  isSaving: boolean;
  outstanding?: number;
  onCreate: (payload: CreateOrderPaymentDraft) => Promise<unknown>;
  onUpdate: (payload: {
    id: string;
    data: CreateOrderPaymentDraft;
  }) => Promise<unknown>;
  disabled?: boolean;
};

const OrderPaymentsCard: FC<OrderPaymentsCardProps> = ({
  payments,
  isLoading,
  isError,
  isSaving,
  outstanding,
  onCreate,
  onUpdate,
  disabled,
}) => {
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] =
    useState<OrderPaymentsPaymentTypeOptions>("first_deposit");
  const [paidAt, setPaidAt] = useState(defaultPaidAt());
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const hasOutstanding =
    typeof outstanding === "number" && Number.isFinite(outstanding);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editPaymentType, setEditPaymentType] =
    useState<OrderPaymentsPaymentTypeOptions>("first_deposit");
  const [editPaidAt, setEditPaidAt] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const hasPayments = payments.length > 0;
  const inputsDisabled = Boolean(disabled) || isSaving;
  const outstandingLabel = useMemo(() => {
    if (typeof outstanding !== "number") return null;
    return formatCurrency(outstanding) ?? undefined;
  }, [outstanding]);

  const maxAllowedForNew = hasOutstanding ? (outstanding ?? 0) : null;

  const maxAllowedForEdit = (payment: OrderPaymentsResponse) => {
    if (!hasOutstanding) return null;
    return (outstanding ?? 0) + payment.amount;
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

  const isFinalBalance = (type: OrderPaymentsPaymentTypeOptions) =>
    type === "final_balance";

  const isZeroRemaining = (remaining: number) => Math.abs(remaining) < 0.01;

  const handleSubmit = async () => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setSubmitError("Enter a valid amount.");
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

    setSubmitError(null);
    try {
      await onCreate({
        amount: parsedAmount,
        paymentType,
        ...(paidAt ? { paidAt } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      setAmount("");
      setNotes("");
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
    setSubmitError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAmount("");
    setEditPaymentType("first_deposit");
    setEditPaidAt("");
    setEditNotes("");
    setSubmitError(null);
  };

  const handleUpdate = async (payment: OrderPaymentsResponse) => {
    const parsedAmount = Number(editAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setSubmitError("Enter a valid amount.");
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

    setSubmitError(null);
    try {
      await onUpdate({
        id: payment.id,
        data: {
          amount: parsedAmount,
          paymentType: editPaymentType,
          ...(editPaidAt ? { paidAt: editPaidAt } : {}),
          ...(editNotes.trim() ? { notes: editNotes.trim() } : {}),
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
              Outstanding balance: {outstandingLabel}
            </Text>
          ) : null}
        </Flex>

        <Flex gap="3" align="end">
          <Box style={{ minWidth: 160 }}>
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
          <Box style={{ minWidth: 200 }}>
            <Text size="1" color="gray">
              Payment type
            </Text>
            <Select.Root
              value={paymentType}
              onValueChange={(value) =>
                setPaymentType(value as OrderPaymentsPaymentTypeOptions)
              }
            >
              <Select.Trigger disabled={inputsDisabled} />
              <Select.Content>
                {PAYMENT_TYPE_OPTIONS.map((option) => (
                  <Select.Item key={option} value={option}>
                    {formatSnakeCase(option)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Box>
          <Box style={{ minWidth: 160 }}>
            <Text size="1" color="gray">
              Paid date
            </Text>
            <TextField.Root
              type="date"
              lang="en-GB"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
              disabled={inputsDisabled}
            />
          </Box>
          <Box style={{ minWidth: 220, flexGrow: 1 }}>
            <Text size="1" color="gray">
              Notes
            </Text>
            <TextArea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={inputsDisabled}
              rows={2}
            />
          </Box>
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
                <Table.ColumnHeaderCell>Notes</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {payments.map((payment) => {
                const displayDate = payment.paidAt || payment.created || "";
                const isEditing = editingId === payment.id;
                return (
                  <Table.Row key={payment.id}>
                    <Table.Cell>
                      {isEditing ? (
                        <TextField.Root
                          type="date"
                          lang="en-GB"
                          value={editPaidAt}
                          onChange={(event) =>
                            setEditPaidAt(event.target.value)
                          }
                          disabled={inputsDisabled}
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
                          onValueChange={(value) =>
                            setEditPaymentType(
                              value as OrderPaymentsPaymentTypeOptions,
                            )
                          }
                        >
                          <Select.Trigger disabled={inputsDisabled} />
                          <Select.Content>
                            {PAYMENT_TYPE_OPTIONS.map((option) => (
                              <Select.Item key={option} value={option}>
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
                      {isEditing ? (
                        <TextArea
                          value={editNotes}
                          onChange={(event) => setEditNotes(event.target.value)}
                          disabled={inputsDisabled}
                          rows={2}
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
