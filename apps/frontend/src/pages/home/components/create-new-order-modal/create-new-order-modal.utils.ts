import { formatSnakeCase } from "@/utils";

import type { NormalisedCustomer } from "@/api/get-customers";

import type { CreateOrderFormValues } from "../create-new-customer-form/create-new-customer-form";

import type { ModalMode } from "../../home";

import type { FormStage } from "./create-new-order-modal";

export const getModalTitle = (
  mode: ModalMode,
  formStage: FormStage,
  currentCustomerForm: Partial<CreateOrderFormValues> | null,
) => {
  let titlePart = "Create new";

  if (mode === "edit" && currentCustomerForm) {
    if (
      formStage === "paperweight_data" &&
      currentCustomerForm.hasPaperweight
    ) {
      titlePart = "Edit existing";
    }
    if (formStage === "bouquet_data" && currentCustomerForm.bouquets?.length) {
      titlePart = "Edit existing";
    }
  }

  return `${titlePart} ${formatSnakeCase(formStage).toLowerCase()}`;
};

export const buildCustomerFormDefaults = (
  customer: NormalisedCustomer,
): Partial<CreateOrderFormValues> => {
  const order = customer.orderDetails;

  return {
    customerId: customer.customerId,
    orderId: order?.orderId,
    paperweightId: order?.paperWeightOrder?.paperWeightId ?? null,
    orderNo: order?.orderNo as number,
    title: customer.displayName.split(" ")[0],
    firstName: customer.displayName.split(" ")[1],
    surname: customer.displayName.split(" ")[2],
    email: customer.email,
    telephone: customer.phoneNumber,
    howRecommended: customer.howRecommended,
    occasionDate: order?.occasionDate?.split(" ")[0],
    billingAddressLine1: order?.billingAddressLine1,
    billingAddressLine2: order?.billingAddressLine2,
    billingCounty: order?.billingCounty,
    billingTown: order?.billingTown,
    billingPostcode: order?.billingPostcode,
    deliverySameAsBilling: order?.deliverySameAsBilling,
    deliveryAddressLine1: order?.deliveryAddressLine1,
    deliveryAddressLine2: order?.deliveryAddressLine2,
    deliveryCounty: order?.deliveryCounty,
    deliveryPostcode: order?.deliveryPostcode,
    deliveryTown: order?.deliveryTown,
    paperweightPrice: order?.paperWeightOrder?.price,
    paperweightQuantity: order?.paperWeightOrder?.quantity,
    paperweightReceived: order?.paperWeightOrder?.paperweightReceived,
    hasPaperweight: Boolean(order?.paperWeightOrder),
    bouquets: (order?.frameOrder ?? []).map((frameOrder) => {
      const extras = frameOrder.extras ?? null;
      return {
        id: frameOrder.frameId,
        measuredWidthIn: extras?.measuredWidthIn ?? null,
        measuredHeightIn: extras?.measuredHeightIn ?? null,
        layout: frameOrder.layout,
        recommendedSizeWidthIn: extras?.recommendedSizeWidthIn ?? null,
        recommendedSizeHeightIn: extras?.recommendedSizeHeightIn ?? null,
        preservationType: frameOrder.preservationType,
        preservationDate: frameOrder.preservationDate ?? "",
        frameType: frameOrder.frameType,
        framePrice: extras?.framePrice ?? null,
        mountPrice: extras?.mountPrice ?? null,
        glassEngraving: frameOrder.glassEngraving ?? "",
        glassEngravingPrice: extras?.glassEngravingPrice ?? null,
        glassType: frameOrder.glassType ?? "",
        glassPrice: extras?.glassPrice ?? null,
        inclusions: frameOrder.inclusions ?? "",
        mountColour: frameOrder.mountColour,
        artworkComplete: Boolean(frameOrder.artworkComplete),
        framingComplete: Boolean(frameOrder.framingComplete),
      };
    }),
  };
};
