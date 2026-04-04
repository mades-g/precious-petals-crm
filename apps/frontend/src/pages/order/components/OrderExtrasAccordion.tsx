import type { FC } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Flex,
  Heading,
  Table,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";

import type { FrameGlassDraft, OrderExtrasDraft } from "../types";

export type OrderExtrasAccordionProps = {
  orderExtras: OrderExtrasDraft;
  frameGlassDrafts: FrameGlassDraft[];
  summary: string[];
  onUpdateField: (
    key: keyof OrderExtrasDraft,
    value: OrderExtrasDraft[keyof OrderExtrasDraft],
  ) => void;
  onUpdateFrameGlass: (
    frameId: string,
    changes: Partial<Pick<FrameGlassDraft, "clearviewEnabled" | "price">>,
  ) => void;
  onSave: () => void;
  isSaving: boolean;
  error?: string | null;
};

const parseNumberInput = (value: string) => {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) return null;
  return parsed < 0 ? 0 : parsed;
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
      id: "recreate-buttonhole",
      label: "Recreate buttonhole",
      qtyKey: "recreateButtonholeQty",
      priceKey: "recreateButtonholePrice",
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
  frameGlassDrafts,
  summary,
  onUpdateField,
  onUpdateFrameGlass,
  onSave,
  isSaving,
  error,
}) => {
  return (
    <Card>
      <Flex direction="column" gap="4">
        <Flex justify="between" align="start" wrap="wrap" gap="3">
          <Flex direction="column" gap="1">
            <Heading size="3">Order extras</Heading>
            <Text size="1" color="gray">
              Update extras, glass upgrades, and order notes.
            </Text>
          </Flex>
          <Flex gap="2" wrap="wrap" justify="end">
            {summary.length > 0 ? (
              summary.map((item) => (
                <Badge key={item} variant="soft" color="gray">
                  {item}
                </Badge>
              ))
            ) : (
              <Text size="1" color="gray">
                No extras added yet
              </Text>
            )}
          </Flex>
        </Flex>

        <Box>
          <Flex direction="column" gap="1" mb="2">
            <Heading size="3">Other extras</Heading>
            <Text size="1" color="gray">
              Toggle each extra on only when needed, then set its price.
            </Text>
          </Flex>
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Y / N</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Price</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {orderExtrasRows.map((row) => {
                const qtyValue = row.qtyKey ? orderExtras[row.qtyKey] : null;
                const isEnabled = row.toggleKey
                  ? Boolean(orderExtras[row.toggleKey])
                  : row.qtyKey
                    ? typeof qtyValue === "number" && qtyValue > 0
                    : row.priceKey
                      ? orderExtras[row.priceKey] != null
                      : true;

                return (
                  <Table.Row key={row.id}>
                    <Table.Cell>{row.label}</Table.Cell>
                    <Table.Cell>
                      <Checkbox
                        checked={isEnabled}
                        onCheckedChange={(checked) => {
                          const enabled = Boolean(checked);

                          if (row.toggleKey) {
                            onUpdateField(row.toggleKey, enabled);
                          } else if (row.qtyKey) {
                            onUpdateField(row.qtyKey, enabled ? 1 : null);
                          }

                          if (!enabled) {
                            if (row.qtyKey) onUpdateField(row.qtyKey, null);
                            if (row.priceKey) onUpdateField(row.priceKey, null);
                          }
                        }}
                      />
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
            </Table.Body>
          </Table.Root>
        </Box>

        {frameGlassDrafts.length > 0 ? (
          <Box>
            <Flex direction="column" gap="1" mb="2">
              <Heading size="3">Glass upgrades</Heading>
              <Text size="1" color="gray">
                Conservation glass is the default. Enable Clearview UV glass
                only where needed.
              </Text>
            </Flex>
            <Table.Root variant="surface">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Bouquet</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Clearview UV glass</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Price</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {frameGlassDrafts.map((draft) => (
                  <Table.Row key={draft.frameId}>
                    <Table.Cell>{draft.label}</Table.Cell>
                    <Table.Cell>
                      <Checkbox
                        checked={draft.clearviewEnabled}
                        onCheckedChange={(checked) =>
                          onUpdateFrameGlass(draft.frameId, {
                            clearviewEnabled: Boolean(checked),
                            ...(checked ? {} : { price: null }),
                          })
                        }
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <TextField.Root
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.price == null ? "" : String(draft.price)}
                        onChange={(event) =>
                          onUpdateFrameGlass(draft.frameId, {
                            price: parseNumberInput(event.target.value),
                          })
                        }
                        disabled={!draft.clearviewEnabled}
                      />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        ) : null}

        {error ? (
          <Text size="2" color="red">
            {error}
          </Text>
        ) : null}

        <Box>
          <Text size="2" weight="medium" mb="1">
            Notes
          </Text>
          <TextArea
            value={orderExtras.notes}
            onChange={(event) => onUpdateField("notes", event.target.value)}
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
    </Card>
  );
};

export default OrderExtrasAccordion;
