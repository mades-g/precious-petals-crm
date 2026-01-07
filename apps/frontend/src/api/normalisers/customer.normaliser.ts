import type { CustomersResponse } from "@/services/pb/types";

import type { ExpandedOrdersResponse } from "../get-customers";

const normaliseFrameOrder = (
  expandedRecord: ExpandedOrdersResponse["orderId"]["expand"],
) => {
  if (!expandedRecord.frameOrderId) return [];

  console.log("expandedRecord", expandedRecord.frameOrderId[0])

  return expandedRecord.frameOrderId.map(
    ({
      updated,
      created,
      extras,
      sizeX,
      sizeY,
      framingComplete,
      frameType,
      artistHours,
      artworkComplete,
      preservationDate,
      preservationType,
      price,
      layout,
      inclusions,
      collectionId: colId,
      glassEngraving,
      glassType,
      special_notes: specialNotes,
      frameMountColour: mountColour,
      id: frameId,
    }) => ({
      size: `${sizeX}x${sizeY} inches`,
      artistsHours: artistHours,
      frameType,
      artworkComplete,
      preservationDate,
      preservationType,
      layout,
      price,
      colId,
      glassEngraving,
      glassType,
      inclusions,
      specialNotes,
      frameId,
      framingComplete,
      updated,
      created,
      mountColour,
      extras, // details to Generate Invoice
    }),
  );
};

const normalisePaperWeightOrder = (
  expandedRecord: ExpandedOrdersResponse["orderId"]["expand"],
) => {
  if (!expandedRecord.paperweightOrderId) return null;

  const {
    paperweightOrderId: {
      created,
      collectionId: colId,
      id: paperWeightId,
      price,
      updated,
      paperweightReceived,
      quantity,
    },
  } = expandedRecord;

  return {
    colId,
    created,
    paperWeightId,
    paperweightReceived,
    price,
    quantity,
    updated,
  };
};

const normaliseOrder = (expandedRecord: ExpandedOrdersResponse) => {
  if (!expandedRecord.orderId) return null;

  const {
    orderId: {
      id: orderId,
      occasionDate,
      orderNo,
      orderStatus,
      payment_status: paymentStatus,
      billingAddressLine1,
      billingAddressLine2,
      billingTown,
      billingCounty,
      billingPostcode,
      deliverySameAsBilling,
      deliveryAddressLine1,
      deliveryAddressLine2,
      deliveryTown,
      deliveryCounty,
      deliveryPostcode,
      updated,
      created,
      collectionId: colId,
      expand,
    },
  } = expandedRecord;

  const frameOrder = normaliseFrameOrder(expand);
  const paperWeightOrder = normalisePaperWeightOrder(expand);

  return {
    colId,
    orderId,
    orderNo,
    orderStatus,
    paymentStatus,
    occasionDate,
    updated,
    created,
    paperWeightOrder,
    frameOrder: [...frameOrder],
    billingAddressLine1,
    billingAddressLine2,
    billingTown,
    billingCounty,
    billingPostcode,
    deliverySameAsBilling,
    deliveryAddressLine1,
    deliveryAddressLine2,
    deliveryTown,
    deliveryCounty,
    deliveryPostcode,
  };
};

export const normalisedCustomer = ({
  firstName,
  surname,
  title,
  expand,
  telephone: phoneNumber,
  email,
  howRecommended,
  id,
  collectionId: colId,
}: CustomersResponse<ExpandedOrdersResponse>) => {
  const nameParts = [title, firstName, surname].filter(Boolean);
  const displayName = nameParts.join(" ");

  const orderDetails = normaliseOrder(expand);

  return {
    displayName,
    phoneNumber,
    customerId: id,
    colId,
    email,
    orderDetails,
    howRecommended,
    title,
    firstName,
    surname,
  };
};
