import { Fragment, type FC } from "react";
import { Box, Card, Table, Text } from "@radix-ui/themes";

import { formatCurrency } from "@/utils";
import FrameItemActions from "./FrameItemActions";
import PaperweightItemActions from "./PaperweightItemActions";
import type { LineItem, OrderFrame, OrderPaperweight } from "../types";

export type OrderItemsTableProps = {
  lineItems: LineItem[];
  paperweight: OrderPaperweight;
  paperweightReceived: boolean;
  onEditFrame: (frameId: string | null | undefined) => void;
  onEditPaperweight: () => void;
  onToggleArtworkComplete: (frame: OrderFrame, next: boolean) => void;
  onToggleFramingComplete: (frame: OrderFrame, next: boolean) => void;
  onTogglePaperweightReceived: (next: boolean) => void;
  isSavingCompletion: boolean;
  isSavingPaperweight: boolean;
};

const OrderItemsTable: FC<OrderItemsTableProps> = ({
  lineItems,
  paperweight,
  paperweightReceived,
  onEditFrame,
  onEditPaperweight,
  onToggleArtworkComplete,
  onToggleFramingComplete,
  onTogglePaperweightReceived,
  isSavingCompletion,
  isSavingPaperweight,
}) => {
  const mainItems = lineItems.filter((item) => item.kind !== "extra");
  const extrasByFrameId = new Map<
    string,
    Array<{ id: string; description: string; total: number }>
  >();

  lineItems.forEach((item) => {
    if (item.kind !== "extra" || !item.frame?.frameId) return;
    const key = item.frame.frameId;
    const arr = extrasByFrameId.get(key) ?? [];
    arr.push({ id: item.id, description: item.description, total: item.total });
    extrasByFrameId.set(key, arr);
  });

  if (mainItems.length === 0) {
    return (
      <Card>
        <Text size="2" color="gray">
          No items found on this order.
        </Text>
      </Card>
    );
  }

  return (
    <Box>
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>#</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Qty</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Unit price</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Amount</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Options</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {mainItems.map((item, index) => {
            const isFrame = item.kind === "frame";
            const extras =
              isFrame && item.frame?.frameId
                ? (extrasByFrameId.get(item.frame.frameId) ?? [])
                : [];

            return (
              <Fragment key={item.id}>
                <Table.Row>
                  <Table.Cell>{`Item ${index + 1}`}</Table.Cell>
                  <Table.Cell>{item.description}</Table.Cell>
                  <Table.Cell>{item.qty}</Table.Cell>
                  <Table.Cell>{formatCurrency(item.unitPrice)}</Table.Cell>
                  <Table.Cell>{formatCurrency(item.total)}</Table.Cell>
                  <Table.Cell>
                    {item.kind === "frame" && item.frame ? (
                      <FrameItemActions
                        frame={item.frame}
                        onEdit={() => onEditFrame(item.frame?.frameId)}
                        onToggleArtworkComplete={(next) =>
                          onToggleArtworkComplete(item.frame!, next)
                        }
                        onToggleFramingComplete={(next) =>
                          onToggleFramingComplete(item.frame!, next)
                        }
                        isSavingCompletion={isSavingCompletion}
                      />
                    ) : item.kind === "paperweight" ? (
                      <PaperweightItemActions
                        onEdit={onEditPaperweight}
                        received={paperweightReceived}
                        onToggleReceived={onTogglePaperweightReceived}
                        disabled={
                          !paperweight?.paperWeightId || isSavingPaperweight
                        }
                      />
                    ) : null}
                  </Table.Cell>
                </Table.Row>
                {extras.map((extra) => (
                  <Table.Row key={`${item.id}-${extra.id}`}>
                    <Table.Cell />
                    <Table.Cell>
                      <Text size="2" color="gray">
                        {extra.description}
                      </Text>
                    </Table.Cell>
                    <Table.Cell />
                    <Table.Cell />
                    <Table.Cell>{formatCurrency(extra.total)}</Table.Cell>
                    <Table.Cell />
                  </Table.Row>
                ))}
              </Fragment>
            );
          })}
        </Table.Body>
      </Table.Root>
    </Box>
  );
};

export default OrderItemsTable;
