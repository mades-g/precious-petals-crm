import type { FC } from "react";
import {
  Badge,
  Box,
  Code,
  DropdownMenu,
  Flex,
  IconButton,
  Separator,
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

type CustomerRowProps = {
  customer: NormalisedCustomer;
  onClick: (formStage: FormStage) => void;
};

const CustomerRow: FC<CustomerRowProps> = ({ customer, onClick }) => {
  const { displayName, email, phoneNumber, howRecommended, orderDetails } =
    customer;
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

  const navigate = useNavigate();

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
            <Badge
              color={getOrderStatusColor(orderDetails!.orderStatus)}
              variant="soft"
              radius="full"
            >
              {formatSnakeCase(orderDetails!.orderStatus)}
            </Badge>
          ) : (
            <Badge color="gray" variant="soft" radius="full">
              No status
            </Badge>
          )}
        </Flex>
      </Table.RowHeaderCell>
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
      <Table.Cell>
        {hasOrder ? (
          <Flex direction="column" gap="1">
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
            <Box>
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
          <Text>-</Text>
        )}
      </Table.Cell>
      <Table.Cell>
        {hasOrder && orderDetails!.occasionDate ? (
          <Text>{formatDate(orderDetails!.occasionDate)}</Text>
        ) : (
          <Text>-</Text>
        )}
      </Table.Cell>
      <Table.Cell>
        {hasOrder && paymentStatus ? (
          <Badge color="orange" variant="soft" radius="full">
            {formatSnakeCase(paymentStatus)}
          </Badge>
        ) : (
          <Text>-</Text>
        )}
      </Table.Cell>
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
      <Table.Cell>
        {orderDetails?.paperWeightOrder ? (
          <Flex gap="1" direction="column">
            <Text>Quantity: {orderDetails.paperWeightOrder.quantity}</Text>
            <Text>
              Received:{" "}
              {orderDetails.paperWeightOrder.paperweightReceived ? "Yes" : "No"}
            </Text>
          </Flex>
        ) : (
          <Text>-</Text>
        )}
      </Table.Cell>
      <Table.Cell>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton variant="soft">
              <DotsHorizontalIcon width="18" height="18" />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item
              onClick={() =>
                navigate("/order", {
                  state: {
                    customer,
                  },
                })
              }
            >
              <Text>View order</Text>
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={() => onClick("costumer_data")}>
              <Text>Edit costumer data</Text>
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={() => onClick("bouquet_data")}>
              <Text>Edit bouquet data</Text>
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={() => onClick("paperweight_data")}>
              <Text>Edit paperweight data</Text>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Table.Cell>
    </Table.Row>
  );
};

export default CustomerRow;
