import type { FC } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Heading,
  Table,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "@radix-ui/react-icons";

import type { OrderExtrasDraft } from "../types";
import orderPageStyles from "../order.module.css";

export type OrderExtrasAccordionProps = {
  orderExtras: OrderExtrasDraft;
  summary: string[];
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onUpdateField: (
    key: keyof OrderExtrasDraft,
    value: OrderExtrasDraft[keyof OrderExtrasDraft],
  ) => void;
  onSave: () => void;
  isSaving: boolean;
};

const parseNumberInput = (value: string) => {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
};

const orderExtrasRows: Array<{
  id: string;
  label: string;
  toggleKey?: "replacementFlowers" | "returnUnusedFlowers";
  qtyKey?: keyof OrderExtrasDraft;
  priceKey?: keyof OrderExtrasDraft;
}> = [
  {
    id: "replacement-flowers",
    label: "Replacement flowers",
    toggleKey: "replacementFlowers",
    qtyKey: "replacementFlowersQty",
    priceKey: "replacementFlowersPrice",
  },
  {
    id: "collection",
    label: "Collection",
    qtyKey: "collectionQty",
    priceKey: "collectionPrice",
  },
  {
    id: "delivery",
    label: "Delivery",
    qtyKey: "deliveryQty",
    priceKey: "deliveryPrice",
  },
  {
    id: "return-unused-flowers",
    label: "Return unused flowers",
    toggleKey: "returnUnusedFlowers",
    priceKey: "returnUnusedFlowersPrice",
  },
];

const OrderExtrasAccordion: FC<OrderExtrasAccordionProps> = ({
  orderExtras,
  summary,
  open,
  onOpenChange,
  onUpdateField,
  onSave,
  isSaving,
}) => {
  return (
    <Accordion.Root
      className={orderPageStyles.root}
      type="single"
      collapsible
      value={open ? "order-extras" : ""}
      onValueChange={(value) => onOpenChange(value === "order-extras")}
    >
      <Accordion.Item className={orderPageStyles.item} value="order-extras">
        <Accordion.Header className={orderPageStyles.header}>
          <Accordion.Trigger className={orderPageStyles.trigger}>
            <Flex
              direction="column"
              gap="1"
              align="start"
              className={orderPageStyles.triggerContent}
            >
              <Heading size="3">Order extras</Heading>
              {summary.length > 0 ? (
                <Flex gap="2" wrap="wrap">
                  {summary.map((item) => (
                    <Badge key={item} variant="soft" color="gray">
                      {item}
                    </Badge>
                  ))}
                </Flex>
              ) : (
                <Text size="1" color="gray">
                  No extras added yet
                </Text>
              )}
            </Flex>
            <Flex
              align="center"
              gap="2"
              className={orderPageStyles.triggerMeta}
            >
              <Text size="1" color="gray">
                {open ? "Hide details" : "Add details"}
              </Text>
              <ChevronDownIcon
                className={orderPageStyles.chevron}
                aria-hidden
              />
            </Flex>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className={orderPageStyles.content}>
          <Box className={orderPageStyles.contentInner}>
            <Flex direction="column" gap="3">
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Y / N</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Qty</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Price</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {orderExtrasRows.map((row) => {
                    const isEnabled = row.toggleKey
                      ? Boolean(orderExtras[row.toggleKey])
                      : true;

                    return (
                      <Table.Row key={row.id}>
                        <Table.Cell>{row.label}</Table.Cell>
                        <Table.Cell>
                          {row.toggleKey ? (
                            <Checkbox
                              checked={Boolean(orderExtras[row.toggleKey])}
                              onCheckedChange={(checked) =>
                                onUpdateField(row.toggleKey!, Boolean(checked))
                              }
                            />
                          ) : null}
                        </Table.Cell>
                        <Table.Cell>
                          {row.qtyKey ? (
                            <TextField.Root
                              type="number"
                              min="0"
                              step="1"
                              value={
                                orderExtras[row.qtyKey] == null
                                  ? ""
                                  : String(orderExtras[row.qtyKey])
                              }
                              onChange={(event) =>
                                onUpdateField(
                                  row.qtyKey!,
                                  parseNumberInput(event.target.value),
                                )
                              }
                              disabled={!isEnabled}
                            />
                          ) : null}
                        </Table.Cell>
                        <Table.Cell>
                          {row.priceKey ? (
                            <TextField.Root
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                orderExtras[row.priceKey] == null
                                  ? ""
                                  : String(orderExtras[row.priceKey])
                              }
                              onChange={(event) =>
                                onUpdateField(
                                  row.priceKey!,
                                  parseNumberInput(event.target.value),
                                )
                              }
                              disabled={!isEnabled}
                            />
                          ) : null}
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                  <Table.Row>
                    <Table.Cell>Artist hours</Table.Cell>
                    <Table.Cell />
                    <Table.Cell>
                      <TextField.Root
                        type="number"
                        min="0"
                        step="0.1"
                        value={
                          orderExtras.artistHours == null
                            ? ""
                            : String(orderExtras.artistHours)
                        }
                        onChange={(event) =>
                          onUpdateField(
                            "artistHours",
                            parseNumberInput(event.target.value),
                          )
                        }
                      />
                    </Table.Cell>
                    <Table.Cell />
                  </Table.Row>
                </Table.Body>
              </Table.Root>

              <Box>
                <Text size="2" weight="medium" mb="1">
                  Notes
                </Text>
                <TextArea
                  value={orderExtras.notes}
                  onChange={(event) =>
                    onUpdateField("notes", event.target.value)
                  }
                  placeholder="Add notes for this order..."
                  resize="vertical"
                />
              </Box>

              <Flex justify="end">
                <Button size="2" onClick={onSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save details"}
                </Button>
              </Flex>
            </Flex>
          </Box>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
};

export default OrderExtrasAccordion;
