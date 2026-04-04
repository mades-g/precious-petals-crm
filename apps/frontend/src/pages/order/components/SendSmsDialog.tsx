import { useEffect, useMemo, useState, type FC } from "react";
import {
  Box,
  Button,
  Dialog,
  Flex,
  Grid,
  Heading,
  Select,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";

import type { SmsType } from "@/api/send-sms";

type SendSmsDialogProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  order: { id: string; orderNo?: number | null };
  customer: { fullName: string; firstName?: string | null; phone: string };
  totals?: { totalBalance?: string; balanceDue?: string };
  onSend: (payload: {
    orderId: string;
    type: SmsType;
    message: string;
    sender?: string;
  }) => Promise<unknown>;
  isSending: boolean;
};

const TEMPLATE_BY_TYPE: Record<SmsType, string> = {
  deposit_reminder:
    "Hi {firstName}, just a reminder your deposit is due for order {orderNo}.",
  paperweight_received:
    "Hi {firstName}, we've received your paperweight for order {orderNo}.",
  framing_complete:
    "Hi {firstName}, your framing is complete for order {orderNo}.",
  custom: "",
};

const SendSmsDialog: FC<SendSmsDialogProps> = ({
  open,
  onOpenChange,
  order,
  customer,
  totals,
  onSend,
  isSending,
}) => {
  const [type, setType] = useState<SmsType>("deposit_reminder");
  const [message, setMessage] = useState("");
  const [sender, setSender] = useState("PrecPetals");
  const [isPreview, setIsPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toLabel = useMemo(() => {
    const name = customer.fullName || customer.firstName || "Customer";
    return `${name} · ${customer.phone}`;
  }, [customer.fullName, customer.firstName, customer.phone]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (!message.trim()) {
      setMessage(TEMPLATE_BY_TYPE[type]);
    }
  }, [open, type, message]);

  const insertToken = (token: string) => {
    setMessage((prev) => (prev ? `${prev} ${token}` : token));
  };

  const previewText = useMemo(() => {
    const firstName = customer.firstName ?? "";
    const fullName = customer.fullName ?? firstName;
    const orderNo = order.orderNo != null ? String(order.orderNo) : "";
    const totalBalance = totals?.totalBalance ?? "";
    const balanceDue = totals?.balanceDue ?? "";

    return message
      .replaceAll("{firstName}", firstName)
      .replaceAll("{fullName}", fullName)
      .replaceAll("{orderNo}", orderNo)
      .replaceAll("{totalBalance}", totalBalance)
      .replaceAll("{balanceDue}", balanceDue);
  }, [
    message,
    customer.firstName,
    customer.fullName,
    order.orderNo,
    totals?.totalBalance,
    totals?.balanceDue,
  ]);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      setError("Message is required.");
      return;
    }

    setError(null);
    try {
      await onSend({
        orderId: order.id,
        type,
        message: trimmed,
        sender: sender.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send SMS.");
    }
  };

  const segments = Math.max(1, Math.ceil(message.length / 160));

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ width: 560, maxWidth: "95vw" }}>
        <Flex direction="column" gap="4">
          <Flex align="center" justify="between">
            <Heading size="4">Send SMS</Heading>
            <Dialog.Close>
              <Button variant="soft">Close</Button>
            </Dialog.Close>
          </Flex>

          <Text size="2" color="gray">
            To: {toLabel}
          </Text>

          <Grid columns="2" gap="4" width="100%">
            <Box>
              <Text
                as="label"
                size="1"
                color="gray"
                style={{ display: "block", marginBottom: 6 }}
              >
                Template
              </Text>
              <Select.Root
                value={type}
                onValueChange={(value) => {
                  const next = value as SmsType;
                  setType(next);
                  setMessage(TEMPLATE_BY_TYPE[next]);
                }}
              >
                <Select.Trigger style={{ width: "100%" }} />
                <Select.Content>
                  <Select.Item value="deposit_reminder">
                    Deposit reminder
                  </Select.Item>
                  <Select.Item value="paperweight_received">
                    Paperweight received
                  </Select.Item>
                  <Select.Item value="framing_complete">
                    Framing complete
                  </Select.Item>
                  <Select.Item value="custom">Custom</Select.Item>
                </Select.Content>
              </Select.Root>
            </Box>
            <Box>
              <Text
                as="label"
                size="1"
                color="gray"
                style={{ display: "block", marginBottom: 6 }}
              >
                Sender
              </Text>
              <TextField.Root
                style={{ width: "100%" }}
                value={sender}
                onChange={(event) => setSender(event.target.value)}
                disabled
              />
            </Box>
          </Grid>

          <Box>
            <Flex justify="between" align="center" mb="2">
              <Text size="1" color="gray">
                Message
              </Text>
              <Flex align="center" gap="2">
                <Text size="1" color="gray">
                  {message.length} chars · {segments} segments
                </Text>
                <Button
                  size="1"
                  variant="soft"
                  onClick={() => setIsPreview((prev) => !prev)}
                  title={isPreview ? "Edit message" : "Preview message"}
                >
                  {isPreview ? "Edit" : "Preview"}
                </Button>
              </Flex>
            </Flex>
            {isPreview ? (
              <Box
                style={{
                  border: "1px solid var(--gray-a6)",
                  borderRadius: 6,
                  padding: "10px 12px",
                  minHeight: 120,
                  whiteSpace: "pre-wrap",
                }}
              >
                <Text size="2">{previewText || "Preview is empty."}</Text>
              </Box>
            ) : (
              <TextArea
                rows={5}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write your SMS..."
                style={{ width: "100%" }}
              />
            )}
            <Flex gap="2" mt="2" wrap="wrap">
              <Button
                size="1"
                variant="soft"
                onClick={() => insertToken("{firstName}")}
              >
                Insert first name
              </Button>
              <Button
                size="1"
                variant="soft"
                onClick={() => insertToken("{fullName}")}
              >
                Insert full name
              </Button>
              <Button
                size="1"
                variant="soft"
                onClick={() => insertToken("{orderNo}")}
              >
                Insert order no
              </Button>
              <Button
                size="1"
                variant="soft"
                onClick={() => insertToken("{totalBalance}")}
              >
                Insert total balance
              </Button>
              <Button
                size="1"
                variant="soft"
                onClick={() => insertToken("{balanceDue}")}
              >
                Insert balance due
              </Button>
            </Flex>
          </Box>

          {error ? (
            <Text size="2" color="red">
              {error}
            </Text>
          ) : null}

          <Flex justify="end" gap="2">
            <Dialog.Close>
              <Button variant="soft">Cancel</Button>
            </Dialog.Close>
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? "Sending..." : "Send SMS"}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default SendSmsDialog;
