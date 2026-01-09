import type { NormalisedCustomer } from "@/api/get-customers";
import { formatDate } from "@/utils";
import type {
  EmailContext,
  OrderDetails,
  OrderExtrasDraft,
  OrderFrame,
  OrderPaperweight,
  Totals,
} from "../types";

export type BuildEmailPayloadInput = {
  customer: NormalisedCustomer | null | undefined;
  order: OrderDetails | null | undefined;
  frames: OrderFrame[];
  paperweight: OrderPaperweight;
  extras: OrderExtrasDraft;
  totals: Totals;
  emailContext?: EmailContext;
};

export const buildEmailPayload = ({
  customer,
  order,
  frames,
  paperweight,
  extras,
  totals,
  emailContext,
}: BuildEmailPayloadInput) => {
  return {
    customer: {
      id: customer?.customerId,
      title: customer?.title ?? undefined,
      firstName: customer?.firstName ?? "",
      surname: customer?.surname ?? "",
      email: customer?.email ?? "",
      displayName: customer?.displayName,
      phoneNumber: customer?.phoneNumber ?? "",
    },
    order: {
      orderId: order?.orderId,
      orderNo: order?.orderNo,
      created: order?.created ? formatDate(order.created) : "",
      occasionDate: order?.occasionDate ? formatDate(order.occasionDate) : "",
      billingAddressLine1: order?.billingAddressLine1,
      billingAddressLine2: order?.billingAddressLine2,
      billingTown: order?.billingTown,
      billingCounty: order?.billingCounty,
      billingPostcode: order?.billingPostcode,
    },
    orderExtras: {
      replacementFlowers: extras.replacementFlowers,
      replacementFlowersQty: extras.replacementFlowersQty,
      replacementFlowersPrice: extras.replacementFlowersPrice,
      collectionQty: extras.collectionQty,
      collectionPrice: extras.collectionPrice,
      deliveryQty: extras.deliveryQty,
      deliveryPrice: extras.deliveryPrice,
      returnUnusedFlowers: extras.returnUnusedFlowers,
      returnUnusedFlowersPrice: extras.returnUnusedFlowersPrice,
      artistHours: extras.artistHours,
      notes: extras.notes,
    },
    frames,
    paperweight,
    totals,
    emailContext,
  };
};
