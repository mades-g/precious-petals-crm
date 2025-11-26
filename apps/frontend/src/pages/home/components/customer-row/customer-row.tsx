import type { FC } from "react";
import {
  Badge,
  Code,
  Flex,
  IconButton,
  Separator,
  Table,
  Text,
} from "@radix-ui/themes";
import type { normalisedCustomer } from "@/features/customers/normalisers/customer.normaliser";
import {
  formatDate,
  formatSnakeCase,
  howRecommendedColour,
} from "@/features/customers/utils";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";

type CustomerRowProps = {
  customer: ReturnType<typeof normalisedCustomer>;
};

const formatAddressLines = (opts: {
  line1?: string | null;
  line2?: string | null;
  town?: string | null;
  county?: string | null;
  postcode?: string | null;
}): string[] => {
  const { line1, line2, town, county, postcode } = opts;

  const firstLineParts = [line1, line2].filter(
    (v) => v && v.trim().length > 0
  );
  const secondLineParts = [town, county].filter(
    (v) => v && v.trim().length > 0
  );

  const lines: string[] = [];
  if (firstLineParts.length) lines.push(firstLineParts.join(", "));
  if (secondLineParts.length) lines.push(secondLineParts.join(", "));
  if (postcode && postcode.trim().length > 0) lines.push(postcode);

  return lines;
};

const CustomerRow: FC<CustomerRowProps> = ({
  customer: { displayName, email, phoneNumber, howRecommended, orderDetails },
}) => {
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
      <Table.RowHeaderCell>
        <Flex gap="3" align="center" direction="column">
          <Code variant="outline">
            {hasOrder ? `OrderNo ${orderDetails!.orderNo}` : "No order"}
          </Code>
          <Separator orientation="horizontal" />
          {hasOrder && orderDetails!.orderStatus ? (
            <Badge color="gray" variant="soft" radius="full">
              {formatSnakeCase(orderDetails!.orderStatus)}
            </Badge>
          ) : (
            <Badge color="gray" variant="soft" radius="full">
              No status
            </Badge>
          )}
        </Flex>
      </Table.RowHeaderCell>

      {/* Customer */}
      <Table.Cell align="center">
        <Text align="center" weight="medium">
          {displayName}
        </Text>
        <Separator my="3" size="4" />
        <Flex gap="3" align="center" wrap="wrap" justify="center">
          {email}
          <Separator orientation="vertical" />
          {phoneNumber}
          <Separator orientation="vertical" />
          {hasHowRecommended ? (
            <Badge color={howRecommendedColour(howRecommended!)}>
              {howRecommended}
            </Badge>
          ) : (
            <Badge color="gray" variant="soft">
              Not set
            </Badge>
          )}
        </Flex>
      </Table.Cell>

      {/* Delivery address + same-as-billing info */}
      <Table.Cell>
        {hasOrder ? (
          <Flex direction="column" gap="1">
            <Flex align="center" gap="2">
              <Text weight="medium">Delivery</Text>
              {orderDetails!.deliverySameAsBilling ? (
                <Badge color="green" variant="soft" radius="full" size="1">
                  Same as billing
                </Badge>
              ) : (
                <Badge color="yellow" variant="soft" radius="full" size="1">
                  Different from billing
                </Badge>
              )}
            </Flex>

            {deliveryLines.length > 0 ? (
              <Flex gap="1" direction="column" mt="1">
                {deliveryLines.map((line) => (
                  <Text key={line}>{line.toUpperCase()}</Text>
                ))}
              </Flex>
            ) : (
              <Text size="2" color="gray">
                No delivery address set
              </Text>
            )}
          </Flex>
        ) : (
          <Text>-</Text>
        )}
      </Table.Cell>

      {/* Occasion date */}
      <Table.Cell>
        {hasOrder && orderDetails!.occasionDate ? (
          <Text>{formatDate(orderDetails!.occasionDate)}</Text>
        ) : (
          <Text>-</Text>
        )}
      </Table.Cell>

      {/* Payment status */}
      <Table.Cell>
        {hasOrder && paymentStatus ? (
          <Badge color="orange" variant="soft" radius="full">
            {formatSnakeCase(paymentStatus)}
          </Badge>
        ) : (
          <Text>-</Text>
        )}
      </Table.Cell>

      {/* Frame order details */}
      <Table.Cell>
        {orderDetails?.frameOrder && orderDetails.frameOrder.length > 0 ? (
          orderDetails.frameOrder.map((frameOrder) => (
            <Flex gap="1" key={frameOrder.frameId} direction="column">
              <Text>{frameOrder.size}</Text>
              <Text>{frameOrder.frameType}</Text>
              <Text>{frameOrder.layout}</Text>
              <Text>{frameOrder.glassType}</Text>
              <Text>{frameOrder.preservationType}</Text>
            </Flex>
          ))
        ) : (
          <Text>-</Text>
        )}
      </Table.Cell>

      {/* Paperweight */}
      <Table.Cell>
        {orderDetails?.paperWeightOrder ? (
          <Flex gap="1" direction="column">
            <Text>Quantity: {orderDetails.paperWeightOrder.quantity}</Text>
            <Text>
              Received:{" "}
              {orderDetails.paperWeightOrder.paperweightReceived
                ? "Yes"
                : "No"}
            </Text>
          </Flex>
        ) : (
          <Text>-</Text>
        )}
      </Table.Cell>

      {/* Actions */}
      <Table.Cell>
        <IconButton variant="soft">
          <DotsHorizontalIcon width="18" height="18" />
        </IconButton>
      </Table.Cell>
    </Table.Row>
  );
};

export default CustomerRow;
