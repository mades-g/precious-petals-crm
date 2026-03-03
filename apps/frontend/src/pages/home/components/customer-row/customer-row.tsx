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
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  formatAddressLines,
  formatDate,
  formatSnakeCase,
  howRecommendedColour,
  getOrderStatusColor,
  getPaymentStatusColor,
} from "@/utils";
import type { NormalisedCustomer } from "@/api/get-customers";
import { useOrderDeleteMutation } from "@/pages/order/hooks/useOrderDeleteMutation";
import { pb } from "@/services/pb/client";
import { COLLECTIONS, ORDER_STATUS_OPTIONS } from "@/services/pb/constants";
import type { OrdersOrderStatusOptions, Update } from "@/services/pb/types";

import type { FormStage } from "../create-new-order-modal/create-new-order-modal";

import FrameDetailsCell from "./frame-details-cell";
import PaperweightDetailsCell from "./paperweight-details-cell";

type CustomerRowProps = {
  customer: NormalisedCustomer;
  isAdmin: boolean;
  onClick: (formStage: FormStage) => void;
};

const CELL_PAD_STYLE = { paddingTop: "8px", paddingBottom: "8px" };

const CustomerRow: FC<CustomerRowProps> = ({ customer, isAdmin, onClick }) => {
  const { displayName, email, phoneNumber, howRecommended, orderDetails } =
    customer;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { deleteOrder, isDeleting } = useOrderDeleteMutation(
    orderDetails?.orderId,
  );

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
  const isEditDisabled =
    orderDetails?.orderStatus === "ready" &&
    paymentStatus === "final_balance_paid";
  const hasHowRecommended = Boolean(howRecommended);
  const requiredBy = orderDetails?.requiredBy;
  const canDeleteOrder =
    Boolean(orderDetails?.orderId) &&
    orderDetails?.orderStatus === "cancelled" &&
    isAdmin;

  const paymentSequence: Array<NonNullable<typeof paymentStatus>> = [
    "waiting_first_deposit",
    "first_deposit_paid",
    "waiting_second_deposit",
    "second_deposit_paid",
    "waiting_final_balance",
    "final_balance_paid",
  ];
  const paymentIndex = paymentStatus
    ? paymentSequence.indexOf(paymentStatus)
    : -1;
  const hasFirstPayment =
    paymentIndex >= paymentSequence.indexOf("first_deposit_paid");

  const hasFrames = Boolean(orderDetails?.frameOrder?.length);
  const framesComplete = orderDetails
    ? !hasFrames ||
    (Boolean(orderDetails.artworkComplete) &&
      Boolean(orderDetails.framingComplete))
    : false;
  const paperweightComplete = orderDetails?.paperWeightOrder
    ? Boolean(orderDetails.paperWeightOrder.paperweightReceived)
    : true;
  const readyEligible = framesComplete && paperweightComplete;
  const deliveredEligible = paymentStatus === "final_balance_paid";

  const allowedOrderStatuses: Record<
    OrdersOrderStatusOptions,
    OrdersOrderStatusOptions[]
  > = {
    in_progress: ["in_progress", "cancelled", "ready"],
    cancelled: ["cancelled"],
    ready: ["ready", "in_progress", "cancelled", "delivered", "collected"],
    delivered: ["delivered"],
    collected: ["collected"],
  };

  const isOrderStatusDisabled = (status: OrdersOrderStatusOptions) => {
    if (!orderDetails?.orderStatus) return true;
    if (!allowedOrderStatuses[orderDetails.orderStatus].includes(status))
      return true;
    if (status === "in_progress") return !hasFirstPayment;
    if (status === "ready") return !readyEligible;
    if (status === "delivered" || status === "collected") {
      return !deliveredEligible;
    }
    return false;
  };

  const { mutateAsync: updateStatus, isPending: isUpdatingStatus } =
    useMutation({
      mutationFn: async (nextStatus: string) => {
        if (!orderDetails?.orderId) {
          throw new Error("Missing order ID");
        }
        const payload: Update<"orders"> = {
          orderStatus: nextStatus as Update<"orders">["orderStatus"],
        };
        return pb
          .collection(COLLECTIONS.ORDERS)
          .update(orderDetails.orderId, payload);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        if (orderDetails?.orderId) {
          queryClient.invalidateQueries({
            queryKey: ["customer", orderDetails.orderId],
          });
        }
      },
    });

  const handleDeleteOrder = async () => {
    if (!orderDetails?.orderId) return;

    const label = orderDetails.orderNo ?? orderDetails.orderId;
    const confirmed = window.confirm(`Delete order ${label}?`);
    if (!confirmed) return;

    await deleteOrder();
  };

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
          {requiredBy ? (
            <Badge color="orange" variant="soft" radius="full" size="1">
              Required by {requiredBy}
            </Badge>
          ) : null}
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
          <Badge
            color={getPaymentStatusColor(paymentStatus)}
            variant="soft"
            radius="full"
            size="1"
          >
            {formatSnakeCase(paymentStatus)}
          </Badge>
        ) : (
          <Text size="1">-</Text>
        )}
      </Table.Cell>
      <Table.Cell style={CELL_PAD_STYLE}>
        {orderDetails?.frameOrder?.length ? (
          <Flex direction="column" gap="2">
            {orderDetails.frameOrder.map((frame) => (
              <FrameDetailsCell key={frame.frameId} frame={frame} />
            ))}
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
            <DropdownMenu.Item
              onClick={() => onClick("customer_data")}
              disabled={isEditDisabled}
            >
              Edit customer data
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={() => onClick("bouquet_data")}
              disabled={isEditDisabled}
            >
              Edit bouquet data
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={() => onClick("paperweight_data")}
              disabled={isEditDisabled}
            >
              Edit paperweight data
            </DropdownMenu.Item>
            {orderDetails?.orderId ? (
              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger
                  disabled={isUpdatingStatus || !orderDetails?.orderStatus}
                >
                  Update order status
                </DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                  {ORDER_STATUS_OPTIONS.map((status) => (
                    <DropdownMenu.Item
                      key={status}
                      onClick={() => updateStatus(status)}
                      disabled={
                        isUpdatingStatus ||
                        status === orderDetails?.orderStatus ||
                        isOrderStatusDisabled(status)
                      }
                    >
                      {formatSnakeCase(status)}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>
            ) : null}
            {canDeleteOrder ? (
              <DropdownMenu.Item
                color="red"
                onClick={handleDeleteOrder}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting order..." : "Delete order"}
              </DropdownMenu.Item>
            ) : null}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Table.Cell>
    </Table.Row>
  );
};

export default CustomerRow;
