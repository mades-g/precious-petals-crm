import { useNavigate } from "react-router";
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
  getOrderStatusColor,
  getPaymentStatusColor,
} from "@/utils";
import type { NormalisedCustomer } from "@/api/get-customers";

import type { FormStage } from "../create-new-order-modal/create-new-order-modal";

import FrameDetailsCell, {
} from "./frame-details-cell";
import PaperweightDetailsCell from "./paperweight-details-cell";

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
      <Table.Cell style={CELL_PAD_STYLE}>
        {hasOrder && orderDetails!.occasionDate ? (
          <Text size="1">{formatDate(orderDetails!.occasionDate)}</Text>
        ) : (
          <Text size="1">-</Text>
        )}
      </Table.Cell>
      <Table.Cell style={CELL_PAD_STYLE}>
        {hasOrder && paymentStatus ? (
          <Badge color={getPaymentStatusColor(paymentStatus)} variant="soft" radius="full" size="1">
            {formatSnakeCase(paymentStatus)}
          </Badge>
        ) : (
          <Text size="1">-</Text>
        )}
      </Table.Cell>
      <Table.Cell style={CELL_PAD_STYLE}>
        {orderDetails?.frameOrder?.length ? (
          <Flex direction="column" gap="2">
            {orderDetails.frameOrder.map((frame) => <FrameDetailsCell
              key={frame.colId}
              frame={frame}
            />)}
          </Flex>
        ) : (
          <Text size="1">-</Text>
        )}
      </Table.Cell>
      <Table.Cell style={CELL_PAD_STYLE}>
        {orderDetails?.paperWeightOrder ? (
          <PaperweightDetailsCell paperweight={orderDetails.paperWeightOrder} />
        ) : (
          <Text size="1">-</Text>
        )}
      </Table.Cell>
      <Table.Cell style={CELL_PAD_STYLE}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton variant="soft" size="1">
              <DotsHorizontalIcon width="16" height="16" />
            </IconButton>
          </DropdownMenu.Trigger>

          <DropdownMenu.Content>
            <DropdownMenu.Item
              onClick={() => {
                if (!orderDetails?.orderId) return;
                navigate(`/order/${orderDetails.orderId}`);
              }}
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
