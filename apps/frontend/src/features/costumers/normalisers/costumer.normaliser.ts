import type { ExpandedOrdersResponse } from "../api/getCostumers";

import type { CostumersResponse } from "@/services/pb/types";

const normaliseFrameOrder = (
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
      framingComplete,
      frameColour,
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
      id: frameId,
    }) => ({
      size: `${sizeX}x${sizeY}`,
      artistsHours: artistHours,
      frameColour,
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
      extras, // details to create invoice
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
      addressPostcode,
      deliveryAddress,
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
    deliveryAddress,
    occasionDate,
    addressPostcode,
    updated,
    created,
    paperWeightOrder,
    frameOrder: [...frameOrder],
  };
};

export const normalisedCostumer = (
  record: CostumersResponse<ExpandedOrdersResponse>,
) => {
  const displayName = `${record.title} ${record.firstName} ${record.surname}`;
  const orderDetails = normaliseOrder(record.expand);

  return {
    displayName,
    phoneNumber: record.telephone,
    costumerId: record.id,
    colId: record.collectionId,
    email: record.email,
    orderDetails,
  };
};
