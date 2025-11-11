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

// Order	Customer	Delivery address	Occasion date	Payment status	Order status	Preservation type	Actions
type CustomerRowProps = {
  customer: ReturnType<typeof normalisedCustomer>;
};

const CustomerRow: FC<CustomerRowProps> = ({
  customer: { displayName, email, phoneNumber, howRecommended, orderDetails },
}) => {
  return (
    <Table.Row>
      <Table.RowHeaderCell>
        <Flex gap="3" align="center" direction="column">
          <Code variant="outline">OrderNo {orderDetails?.orderNo}</Code>
          <Separator orientation="horizontal" />
          <Badge color="jade" variant="soft" radius="full">
            {formatSnakeCase(orderDetails?.orderStatus)}
          </Badge>
        </Flex>
      </Table.RowHeaderCell>
      <Table.Cell align="center">
        <Text align="center" weight="medium">
          {displayName}
        </Text>
        <Separator my="3" size="4" />
        <Flex gap="3" align="center">
          {email}
          <Separator orientation="vertical" />
          {phoneNumber}
          <Separator orientation="vertical" />
          <Badge color={howRecommendedColour(howRecommended)}>
            {howRecommended}
          </Badge>
        </Flex>
      </Table.Cell>
      <Table.Cell>
        {orderDetails ? (
          <Flex gap="1" direction="column">
            {orderDetails.deliveryAddress.split(", ").map((text) => (
              <Text key={text}>{text.toUpperCase()}</Text>
            ))}
            <Text>{orderDetails.addressPostcode.toUpperCase()}</Text>
          </Flex>
        ) : (
          <Text>-</Text>
        )}
      </Table.Cell>
      <Table.Cell>
        {orderDetails ? (
          <Text>{formatDate(orderDetails.occasionDate)}</Text>
        ) : (
          <Text>-</Text>
        )}
      </Table.Cell>
      <Table.Cell>
        {orderDetails ? (
          <Badge color="orange" variant="soft" radius="full">
            {formatSnakeCase(orderDetails.paymentStatus)}
          </Badge>
        ) : (
          <Text>-</Text>
        )}
      </Table.Cell>
      <Table.Cell>
        {orderDetails?.frameOrder ? (
          orderDetails?.frameOrder.map((frameOrder) => (
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
      <Table.Cell>
        {orderDetails?.paperWeightOrder ? (
          <Flex gap="1" direction="column">
            <Text>Quantity: {orderDetails?.paperWeightOrder.quantity}</Text>
            <Text>
              Received:{" "}
              {orderDetails?.paperWeightOrder.paperweightReceived
                ? "Yes"
                : "No"}
            </Text>
          </Flex>
        ) : (
          <Text>-</Text>
        )}
      </Table.Cell>
      <Table.Cell>
        <IconButton variant="soft">
          <DotsHorizontalIcon width="18" height="18" />
        </IconButton>
      </Table.Cell>
    </Table.Row>
  );
};

export default CustomerRow;
