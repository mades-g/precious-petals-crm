import { type FC } from "react";
import { useFormContext } from "react-hook-form";
import { Box, Flex, Text, Separator, Button } from "@radix-ui/themes";

import type { CreateOrderFormValues } from "../create-new-customer-form/create-new-customer-form";
import ReviewDataRow from "../review-data-row/review-data-row";

type ReviewDataProps = {
  onEditCustomer: () => void;
  onEditBouquets: () => void;
  onEditPaperweight: () => void;
  submitError?: string | null;
};

const ReviewData: FC<ReviewDataProps> = ({
  onEditCustomer,
  onEditBouquets,
  onEditPaperweight,
  submitError,
}) => {
  const { getValues } = useFormContext<CreateOrderFormValues>();
  const values = getValues();

  // --- Bouquets totals (frame + mount) ------------------------------------
  const bouquetTotal = values.bouquets.reduce((sum, bq) => {
    const frame = typeof bq.framePrice === "number" ? bq.framePrice : 0;
    const mount = typeof bq.mountPrice === "number" ? bq.mountPrice : 0;
    return sum + frame + mount;
  }, 0);

  // --- Paperweight totals --------------------------------------------------
  const hasPaperweight = Boolean(values.paperweightPrice || values.paperweightQuantity);
  const paperweightQuantity = values.paperweightQuantity || 0;
  const paperweightPrice = values.paperweightPrice || 0;
  const paperweightTotal = hasPaperweight
    ? paperweightQuantity * paperweightPrice
    : 0;

  const grandTotal = bouquetTotal + paperweightTotal;

  // --- Addresses -----------------------------------------------------------
  const billingAddress = formatAddress({
    line1: values.billingAddressLine1,
    line2: values.billingAddressLine2,
    town: values.billingTown,
    county: values.billingCounty,
    postcode: values.billingPostcode,
  });

  const deliverySameAsBilling = values.deliverySameAsBilling;
  const deliveryAddress = deliverySameAsBilling
    ? billingAddress
    : formatAddress({
        line1: values.deliveryAddressLine1,
        line2: values.deliveryAddressLine2,
        town: values.deliveryTown,
        county: values.deliveryCounty,
        postcode: values.deliveryPostcode,
      });

  return (
    <Flex direction="column" gap="4">
      {submitError && (
        <Box
          style={{
            borderRadius: 8,
            border: "1px solid var(--red-6)",
            backgroundColor: "var(--red-3)",
            padding: 8,
          }}
        >
          <Text size="2" color="red" weight="bold">
            {submitError}
          </Text>
        </Box>
      )}

      {/* Customer details card */}
      <Box
        style={{
          borderRadius: 8,
          border: "1px solid var(--gray-5)",
          padding: 12,
        }}
      >
        <Flex justify="between" align="center" mb="2">
          <Text weight="bold">Customer details</Text>
          <Button
            type="button"
            size="1"
            variant="soft"
            onClick={onEditCustomer}
          >
            Edit
          </Button>
        </Flex>
        <Separator orientation="horizontal" size="3" mb="2" />
        <Flex direction="column" gap="1">
          <ReviewDataRow label="Name">
            {[values.title, values.firstName, values.surname]
              .filter(Boolean)
              .join(" ")}
          </ReviewDataRow>
          <ReviewDataRow label="Email">{values.email}</ReviewDataRow>
          <ReviewDataRow label="Telephone">{values.telephone}</ReviewDataRow>
          <ReviewDataRow label="How recommended">
            {values.howRecommended}
          </ReviewDataRow>
          <ReviewDataRow label="Billing address">
            {billingAddress || "—"}
          </ReviewDataRow>
          <ReviewDataRow label="Delivery address">
            {deliverySameAsBilling ? (
              <Text size="2">
                Same as billing address
                <br />
                {billingAddress || "—"}
              </Text>
            ) : (
              deliveryAddress || "—"
            )}
          </ReviewDataRow>
          <ReviewDataRow label="Occasion date">
            {values.occasionDate}
          </ReviewDataRow>
          <ReviewDataRow label="Preservation date">
            {values.preservationDate || "—"}
          </ReviewDataRow>
        </Flex>
      </Box>

      {/* Bouquets card */}
      <Box
        style={{
          borderRadius: 8,
          border: "1px solid var(--gray-5)",
          padding: 12,
        }}
      >
        <Flex justify="between" align="center" mb="2">
          <Text weight="bold">
            Bouquets{" "}
            {values.bouquets.length > 0 ? `(${values.bouquets.length})` : ""}
          </Text>
          <Button
            type="button"
            size="1"
            variant="soft"
            onClick={onEditBouquets}
          >
            Edit
          </Button>
        </Flex>
        <Separator orientation="horizontal" size="3" mb="2" />

        {values.bouquets.length === 0 ? (
          <Text size="2" color="gray">
            No bouquets added.
          </Text>
        ) : (
          <Flex direction="column" gap="3">
            {values.bouquets.map((bq, index) => (
              <Box key={index}>
                <Text weight="medium">Bouquet #{index + 1}</Text>
                <Flex direction="column" gap="1" mt="1">
                  <ReviewDataRow label="Measured size">
                    {bq.measuredWidthIn && bq.measuredHeightIn
                      ? `${bq.measuredWidthIn} x ${bq.measuredHeightIn} in`
                      : "—"}
                  </ReviewDataRow>
                  <ReviewDataRow label="Layout">
                    {bq.layout || "—"}
                  </ReviewDataRow>
                  <ReviewDataRow label="Recommended frame size">
                    {bq.recommendedSizeWidthIn && bq.recommendedSizeHeightIn
                      ? `${bq.recommendedSizeWidthIn} x ${bq.recommendedSizeHeightIn} in`
                      : "—"}
                  </ReviewDataRow>
                  <ReviewDataRow label="Preservation type">
                    {bq.preservationType || "—"}
                  </ReviewDataRow>
                  <ReviewDataRow label="Frame type">
                    {bq.frameType || "—"}
                  </ReviewDataRow>
                  <ReviewDataRow label="Mount colour">
                    {bq.mountColour || "—"}
                  </ReviewDataRow>
                  <ReviewDataRow label="Frame price">
                    {typeof bq.framePrice === "number"
                      ? `£${bq.framePrice.toFixed(2)}`
                      : "—"}
                  </ReviewDataRow>
                  <ReviewDataRow label="Mount price">
                    {typeof bq.mountPrice === "number"
                      ? `£${bq.mountPrice.toFixed(2)}`
                      : "—"}
                  </ReviewDataRow>
                </Flex>

                {index < values.bouquets.length - 1 && (
                  <Separator orientation="horizontal" size="2" mt="2" />
                )}
              </Box>
            ))}
          </Flex>
        )}
      </Box>

      {/* Paperweight card */}
      <Box
        style={{
          borderRadius: 8,
          border: "1px solid var(--gray-5)",
          padding: 12,
        }}
      >
        <Flex justify="between" align="center" mb="2">
          <Text weight="bold">Paperweight</Text>
          <Button
            type="button"
            size="1"
            variant="soft"
            onClick={onEditPaperweight}
          >
            Edit
          </Button>
        </Flex>
        <Separator orientation="horizontal" size="3" mb="2" />
        {!hasPaperweight ? (
          <Text size="2" color="gray">
            No paperweights added.
          </Text>
        ) : (
          <Flex direction="column" gap="1">
            <ReviewDataRow label="Quantity">
              {paperweightQuantity || "—"}
            </ReviewDataRow>
            <ReviewDataRow label="Price per unit">
              {paperweightPrice ? `£${paperweightPrice.toFixed(2)}` : "—"}
            </ReviewDataRow>
            <ReviewDataRow label="Subtotal">
              {paperweightTotal ? `£${paperweightTotal.toFixed(2)}` : "—"}
            </ReviewDataRow>
          </Flex>
        )}
      </Box>

      {/* Totals card */}
      <Box
        style={{
          borderRadius: 8,
          border: "1px solid var(--gray-8)",
          padding: 12,
          backgroundColor: "var(--gray-1)",
        }}
      >
        <Text weight="bold" mb="2">
          Order total
        </Text>
        <Separator orientation="horizontal" size="3" mb="2" />
        <Flex direction="column" gap="1">
          <ReviewDataRow label="Bouquets total">
            {bouquetTotal ? `£${bouquetTotal.toFixed(2)}` : "£0.00"}
          </ReviewDataRow>
          <ReviewDataRow label="Paperweight total">
            {paperweightTotal ? `£${paperweightTotal.toFixed(2)}` : "£0.00"}
          </ReviewDataRow>
          <Separator orientation="horizontal" size="2" my="1" />
          <ReviewDataRow label="Grand total">
            <Text as="span" weight="bold">
              £{grandTotal.toFixed(2)}
            </Text>
          </ReviewDataRow>
        </Flex>
      </Box>
    </Flex>
  );
};

type AddressParts = {
  line1?: string | null;
  line2?: string | null;
  town?: string | null;
  county?: string | null;
  postcode?: string | null;
};

const formatAddress = ({
  line1,
  line2,
  town,
  county,
  postcode,
}: AddressParts): string => {
  return [line1, line2, town, county, postcode]
    .filter((p) => p && String(p).trim().length > 0)
    .join(", ");
};

export default ReviewData;
