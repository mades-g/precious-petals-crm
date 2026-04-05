import type { CustomersResponse } from "@/services/pb/types";

import type { ExpandedOrdersResponse } from "../get-customers";

export const normaliseFrameOrder = (
  expandedRecord: ExpandedOrdersResponse["orderId"]["expand"],
) => {
  if (!expandedRecord.frameOrderId) return [];

  return expandedRecord.frameOrderId.map(
    ({
      updated,
      created,
      extras,
      sizeX,
      sizeY,
      frameType,
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
      measuredSize: `${sizeX}x${sizeY} inches`,
      recommendedSize:
        extras?.recommendedSizeWidthIn != null &&
        extras?.recommendedSizeHeightIn != null
          ? `${extras.recommendedSizeWidthIn}x${extras.recommendedSizeHeightIn} inches`
          : null,
      frameType,
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
      updated,
      created,
      mountColour,
      extras, // details to Generate Invoice
    }),
  );
};

export const normalisePaperWeightOrder = (
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

export const normaliseOrder = (expandedRecord: ExpandedOrdersResponse) => {
  if (!expandedRecord.orderId) return null;

  const {
    orderId: {
      id: orderId,
      occasionDate,
      orderNo,
      orderStatus,
      payment_status: paymentStatus,
      notes,
      replacementFlowers,
      replacementFlowersPrice,
      collection,
      collectionPrice,
      delivery,
      deliveryPrice,
      recreateButtonhole,
      recreateButtonholePrice,
      returnUnusedFlowers,
      returnUnusedFlowersPrice,
      artistHours,
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
      requiredBy,
      artworkComplete,
      framingComplete,
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
    notes,
    replacementFlowers,
    replacementFlowersPrice,
    collection,
    collectionPrice,
    delivery,
    deliveryPrice,
    recreateButtonhole,
    recreateButtonholePrice,
    returnUnusedFlowers,
    returnUnusedFlowersPrice,
    artistHours,
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
    requiredBy,
    artworkComplete,
    framingComplete,
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
