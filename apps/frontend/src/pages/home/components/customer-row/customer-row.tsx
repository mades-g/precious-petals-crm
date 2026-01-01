import type { FC } from "react";
import {
  Badge,
  Box,
  Code,
  DropdownMenu,
  Flex,
  IconButton,
  Table,
  Text,
} from "@radix-ui/themes";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";

import {
  formatAddressLines,
  formatDate,
  formatSnakeCase,
  howRecommendedColour,
} from "@/utils";

import type { FormStage } from "../create-new-order-modal/create-new-order-modal";
import { useNavigate } from "react-router";
import type { NormalisedCustomer } from "@/api/get-customers";
import { getOrderStatusColor } from "@/utils";

/* Small local currency helper */
const formatCurrency = (value?: number | null) =>
  typeof value === "number" ? `£${value.toFixed(2)}` : undefined;

/* ----------------------------------------------------------
   FrameDetailsCell — the pill-style frame display component
   (with extras)
----------------------------------------------------------- */

export const FrameDetailsCell: FC<{
  size: string | null;
  frameType: string | null;
  layout: string | null;
  preservationType: string | null;
  price: number | null;
  glassType?: string | null;
  inclusions?: string | null;
  glassEngraving?: string | null;
  extras?: unknown;

  // optional mount colour keys depending on normaliser
  mountColour?: string | null;
  frameMountColour?: string | null;
}> = ({
  size,
  frameType,
  layout,
  preservationType,
  price,
  glassType,
  inclusions,
  glassEngraving,
  extras,
  mountColour,
  frameMountColour,
}) => {
  const label = size ? `${size} inches` : frameType || "Frame";

  const meta = [
    price != null ? formatCurrency(price) : null,
    layout,
    preservationType,
  ]
    .filter(Boolean)
    .join(" · ");

  // extras object is where we stored add-on prices
  const extrasObj = (extras || {}) as {
    glassPrice?: number;
    glassEngravingPrice?: number;
    mountPrice?: number;
    mountCost?: number; // fallback if named differently
  };

  const resolvedMountColour = mountColour ?? frameMountColour ?? null;

  const mountPrice =
    typeof extrasObj.mountPrice === "number"
      ? extrasObj.mountPrice
      : typeof extrasObj.mountCost === "number"
        ? extrasObj.mountCost
        : null;

  // Build grouped lines (new lines) so it doesn't become one mega string
  const mountBits: string[] = [];
  const glassBits: string[] = [];
  const otherBits: string[] = [];

  // Mount line
  if (resolvedMountColour) mountBits.push(`Mount – ${resolvedMountColour}`);
  if (typeof mountPrice === "number" && mountPrice > 0)
    mountBits.push(`Mount ${formatCurrency(mountPrice)}`);

  // Glass line (and buttonhole lives here)
  if (glassType) glassBits.push(glassType);
  if (typeof extrasObj.glassPrice === "number" && extrasObj.glassPrice > 0) {
    glassBits.push(`Glass ${formatCurrency(extrasObj.glassPrice)}`);
  }
  if (inclusions && inclusions !== "No") {
    // "Yes" or "Buttonhole" -> label as Buttonhole
    glassBits.push("Buttonhole");
  }

  // Other line (engraving)
  if (glassEngraving && glassEngraving.trim().length > 0) {
    if (
      typeof extrasObj.glassEngravingPrice === "number" &&
      extrasObj.glassEngravingPrice > 0
    ) {
      otherBits.push(
        `Engraving – ${glassEngraving} (${formatCurrency(
          extrasObj.glassEngravingPrice,
        )})`,
      );
    } else {
      otherBits.push(`Engraving – ${glassEngraving}`);
    }
  } else if (
    typeof extrasObj.glassEngravingPrice === "number" &&
    extrasObj.glassEngravingPrice > 0
  ) {
    otherBits.push(
      `Engraving ${formatCurrency(extrasObj.glassEngravingPrice)}`,
    );
  }

  const extrasLines = [
    mountBits.length ? mountBits.join(" · ") : null,
    glassBits.length ? glassBits.join(" · ") : null,
    otherBits.length ? otherBits.join(" · ") : null,
  ].filter(Boolean) as string[];

  return (
    <Box
      px="2"
      py="1"
      style={{
        borderRadius: 10,
        backgroundColor: "var(--gray-3)",
      }}
    >
      <Text as="div" size="2" weight="medium">
        {label}
      </Text>

      {meta && (
        <Text as="div" size="1" color="gray" weight="medium">
          {meta}
        </Text>
      )}

      {extrasLines.length > 0 && (
        <Box mt="1">
          {extrasLines.map((line, i) => (
            <Text key={i} as="div" size="1" color="gray" weight="bold">
              {line}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
};

/* ----------------------------------------------------------
   PaperweightDetailsCell — pill-style for paperweight
----------------------------------------------------------- */

const PaperweightDetailsCell: FC<{
  quantity: number;
  price: number;
  received?: boolean;
}> = ({ quantity, price, received }) => {
  const qtyLabel =
    quantity === 1 ? "1 paperweight" : `${quantity} paperweights`;
  const priceLabel = formatCurrency(price);

  return (
    <Box
      px="2"
      py="1"
      style={{
        borderRadius: 10,
        backgroundColor: "var(--yellow-3)", // different colour from frames
      }}
    >
      <Text as="div" size="2" weight="medium">
        {qtyLabel}
      </Text>

      <Text as="div" size="1" color="gray" weight="bold">
        {priceLabel} total
        {typeof received === "boolean" &&
          ` · Received: ${received ? "Yes" : "No"}`}
      </Text>
    </Box>
  );
};

/* ----------------------------------------------------------
   CustomerRow
----------------------------------------------------------- */

type CustomerRowProps = {
  customer: NormalisedCustomer;
  onClick: (formStage: FormStage) => void;
};

const CELL_PAD_STYLE = { paddingTop: "8px", paddingBottom: "8px" };

const CustomerRow: FC<CustomerRowProps> = ({ customer, onClick }) => {
  const { displayName, email, phoneNumber, howRecommended, orderDetails } =
    customer;

  const navigate = useNavigate();

  const deliveryLines = orderDetails
    ? formatAddressLines({
        line1: orderDetails.deliveryAddressLine1,
        line2: orderDetails.deliveryAddressLine2,
        town: orderDetails.deliveryTown,
        county: orderDetails.deliveryCounty,
        postcode: orderDetails.deliveryPostcode,
      })
    : [];

  const hasOrder = Boolean(orderDetails);
  const paymentStatus = orderDetails?.paymentStatus;
  const hasHowRecommended = Boolean(howRecommended);

  return (
    <Table.Row>
      {/* Order + status */}
      <Table.RowHeaderCell style={CELL_PAD_STYLE}>
        <Flex gap="2" align="start" direction="column">
          <Code variant="outline" size="1">
            {hasOrder ? orderDetails!.orderNo : "No order"}
          </Code>

          {hasOrder && orderDetails!.orderStatus ? (
            <Badge
              color={getOrderStatusColor(orderDetails!.orderStatus)}
              variant="soft"
              radius="full"
              size="1"
            >
              {formatSnakeCase(orderDetails!.orderStatus)}
            </Badge>
          ) : (
            <Badge color="gray" variant="soft" radius="full" size="1">
              No status
            </Badge>
          )}
        </Flex>
      </Table.RowHeaderCell>

      {/* Customer + contact */}
      <Table.Cell align="left" style={{ ...CELL_PAD_STYLE, maxWidth: 250 }}>
        <Flex direction="column" align="start" gap="1">
          <Text align="center" weight="medium" size="2">
            {displayName}
          </Text>

          <Flex gap="2" align="center" wrap="wrap" justify="start">
            <Text size="1">{email}</Text>
            <Text size="1">{phoneNumber}</Text>
            {hasHowRecommended ? (
              <Badge color={howRecommendedColour(howRecommended!)} size="1">
                {howRecommended}
              </Badge>
            ) : (
              <Badge color="gray" variant="soft" size="1">
                Not set
              </Badge>
            )}
          </Flex>
        </Flex>
      </Table.Cell>

      {/* Delivery address */}
      <Table.Cell align="left" style={{ ...CELL_PAD_STYLE, maxWidth: 250 }}>
        {hasOrder ? (
          <Flex direction="column" gap="1">
            {deliveryLines.length > 0 ? (
              <Flex direction="column" gap="1">
                {deliveryLines.map((line) => (
                  <Text key={line} size="1">
                    {line.toUpperCase()}
                  </Text>
                ))}
              </Flex>
            ) : (
              <Text size="1" color="gray">
                No delivery address set
              </Text>
            )}

            <Box mt="1">
              {orderDetails!.deliverySameAsBilling ? (
                <Badge color="green" variant="soft" radius="full" size="1">
                  Same as billing
                </Badge>
              ) : (
                <Badge color="yellow" variant="soft" radius="full" size="1">
                  Different from billing
                </Badge>
              )}
            </Box>
          </Flex>
        ) : (
          <Text size="1">-</Text>
        )}
      </Table.Cell>

      {/* Occasion date */}
      <Table.Cell style={CELL_PAD_STYLE}>
        {hasOrder && orderDetails!.occasionDate ? (
          <Text size="1">{formatDate(orderDetails!.occasionDate)}</Text>
        ) : (
          <Text size="1">-</Text>
        )}
      </Table.Cell>

      {/* Payment status */}
      <Table.Cell style={CELL_PAD_STYLE}>
        {hasOrder && paymentStatus ? (
          <Badge color="orange" variant="soft" radius="full" size="1">
            {formatSnakeCase(paymentStatus)}
          </Badge>
        ) : (
          <Text size="1">-</Text>
        )}
      </Table.Cell>

      {/* Frame details — pill style + extras */}
      <Table.Cell style={CELL_PAD_STYLE}>
        {orderDetails?.frameOrder?.length ? (
          <Flex direction="column" gap="2">
            {orderDetails.frameOrder.map((frame, index) => (
              <FrameDetailsCell
                key={frame.frameId ?? index}
                size={frame.size}
                frameType={frame.frameType}
                layout={frame.layout}
                preservationType={frame.preservationType}
                price={frame.price}
                glassType={frame.glassType}
                inclusions={frame.inclusions}
                glassEngraving={frame.glassEngraving}
                extras={frame.extras}
                // support both key names without breaking if one is missing
                mountColour={(frame as any).mountColour}
                frameMountColour={(frame as any).frameMountColour}
              />
            ))}
          </Flex>
        ) : (
          <Text size="1">-</Text>
        )}
      </Table.Cell>

      {/* Paperweight — pill style */}
      <Table.Cell style={CELL_PAD_STYLE}>
        {orderDetails?.paperWeightOrder ? (
          <PaperweightDetailsCell
            quantity={orderDetails.paperWeightOrder.quantity}
            price={orderDetails.paperWeightOrder.price}
            received={orderDetails.paperWeightOrder.paperweightReceived}
          />
        ) : (
          <Text size="1">-</Text>
        )}
      </Table.Cell>

      {/* Actions */}
      <Table.Cell style={CELL_PAD_STYLE}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton variant="soft" size="1">
              <DotsHorizontalIcon width="16" height="16" />
            </IconButton>
          </DropdownMenu.Trigger>

          <DropdownMenu.Content>
            <DropdownMenu.Item
              onClick={() =>
                navigate("/order", {
                  state: { customer },
                })
              }
            >
              View order
            </DropdownMenu.Item>

            <DropdownMenu.Item onClick={() => onClick("costumer_data")}>
              Edit customer data
            </DropdownMenu.Item>

            <DropdownMenu.Item onClick={() => onClick("bouquet_data")}>
              Edit bouquet data
            </DropdownMenu.Item>

            <DropdownMenu.Item onClick={() => onClick("paperweight_data")}>
              Edit paperweight data
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Table.Cell>
    </Table.Row>
  );
};

export default CustomerRow;
