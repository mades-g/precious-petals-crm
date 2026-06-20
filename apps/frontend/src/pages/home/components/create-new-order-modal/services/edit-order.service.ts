import { pb } from "@/services/pb/client";
import {
  CLEARVIEW_GLASS_TYPE,
  COLLECTIONS,
  DEFAULT_FRAME_GLASS_TYPE,
} from "@/services/pb/constants";
import type {
  CustomersHowRecommendedOptions,
} from "@/services/pb/types";

import { updateCustomer } from "@/api/update-customer";
import { updateBouquet } from "@/api/update-bouquet";
import { updatePaperweight } from "@/api/update-paperweight";

import { mapBouquetToFrameItemPayload } from "@/api/mappers/frame-item.mapper";
import { mapOrderAddressesToPayload } from "@/api/mappers/order-address.mapper";
import { hasPaperweightDetails } from "@/api/mappers/paperweight.mapper";

import type { FormStage } from "../create-new-order-modal";
import type { CreateOrderFormValues } from "../../create-new-customer-form/create-new-customer-form";

export type SubmitResult = { ok: true } | { ok: false; error: string };

const ok = (): SubmitResult => ({ ok: true });
const fail = (error: string): SubmitResult => ({ ok: false, error });

type EditOrderStageArgs = {
  stage: FormStage;
  values: CreateOrderFormValues;
  currentCustomerForm: Partial<CreateOrderFormValues> | null;
};

const editCustomerStage = async ({
  values,
  currentCustomerForm,
}: Omit<EditOrderStageArgs, "stage">): Promise<SubmitResult> => {
  if (!currentCustomerForm?.customerId) {
    console.error("Missing customerId for edit mode");
    return ok(); // preserve behaviour: no hard fail
  }

  await updateCustomer({
    id: currentCustomerForm.customerId,
    firstName: values.firstName,
    surname: values.surname,
    email: values.email,
    telephone: values.telephone,
    title: values.title,
    howRecommended: values.howRecommended as
      | CustomersHowRecommendedOptions
      | "",
  });

  if (currentCustomerForm.orderId) {
    await pb
      .collection(COLLECTIONS.ORDERS)
      .update(currentCustomerForm.orderId, {
        orderNo: values.orderNo,
        occasionDate: values.occasionDate,
        ...mapOrderAddressesToPayload(values),
      });
  }

  return ok();
};

const editBouquetStage = async ({
  values,
  currentCustomerForm,
}: Omit<EditOrderStageArgs, "stage">): Promise<SubmitResult> => {
  const newBouquets = values.bouquets ?? [];
  const existingBouquets = currentCustomerForm?.bouquets ?? [];
  const isBouquetComplete = (bq: CreateOrderFormValues["bouquets"][number]) => {
    const glassType = bq.glassType || DEFAULT_FRAME_GLASS_TYPE;
    const hasRequiredMountPrice =
      bq.mountColour === "No Second Mount" || typeof bq.mountPrice === "number";
    const hasRequiredGlassPrice =
      glassType !== CLEARVIEW_GLASS_TYPE ||
      typeof bq.glassPrice === "number";

    return (
      bq.measuredWidthIn !== null &&
      bq.measuredHeightIn !== null &&
      bq.layout &&
      bq.recommendedSizeWidthIn !== null &&
      bq.recommendedSizeHeightIn !== null &&
      bq.preservationType &&
      bq.frameType &&
      typeof bq.framePrice === "number" &&
      bq.mountColour &&
      hasRequiredMountPrice &&
      hasRequiredGlassPrice
    );
  };

  if (
    newBouquets.length > 0 &&
    newBouquets.some((bq) => !isBouquetComplete(bq))
  ) {
    return fail(
      "Please complete all bouquet fields before saving this section.",
    );
  }

  // CASE 1: No existing + no new -> invalid
  if (existingBouquets.length === 0 && newBouquets.length === 0) {
    return fail("Please add at least one bouquet before saving this section.");
  }

  const submittedIds = new Set(
    newBouquets.map((bq) => bq.id).filter((id): id is string => !!id),
  );
  const removedIds = existingBouquets
    .map((bq) => bq.id)
    .filter((id): id is string => !!id && !submittedIds.has(id));
  const bouquetsToCreate = newBouquets.filter((bq) => !bq.id);
  const bouquetsToUpdate = newBouquets.filter(
    (
      bq,
    ): bq is CreateOrderFormValues["bouquets"][number] & { id: string } =>
      !!bq.id,
  );

  await Promise.all(
    bouquetsToUpdate.map((bq) => {
      const payload = mapBouquetToFrameItemPayload(bq);

      return updateBouquet({
        frameId: bq.id,
        ...payload,
      });
    }),
  );

  if (!currentCustomerForm?.orderId) {
    if (removedIds.length > 0 || bouquetsToCreate.length > 0) {
      console.error("Missing orderId when syncing bouquets in edit mode");
    }
    return ok();
  }

  await Promise.all(
    removedIds.map((id) =>
      pb.collection(COLLECTIONS.ORDER_FRAME_ITEMS).delete(id),
    ),
  );

  const createdFrameItems = await Promise.all(
    bouquetsToCreate.map((bq, index) => {
      const payload = mapBouquetToFrameItemPayload(bq);
      const requestKey =
        existingBouquets.length > 0 ? `extra-${index}` : `${index}`;
      return pb
        .collection(COLLECTIONS.ORDER_FRAME_ITEMS)
        .create(payload, { requestKey });
    }),
  );

  let createdIndex = 0;
  const frameOrderId = newBouquets.map((bq) => {
    if (bq.id) return bq.id;
    const created = createdFrameItems[createdIndex];
    createdIndex += 1;
    return created.id;
  });

  await pb.collection(COLLECTIONS.ORDERS).update(currentCustomerForm.orderId, {
    frameOrderId,
  });

  return ok();
};

const editPaperweightStage = async ({
  values,
  currentCustomerForm,
}: Omit<EditOrderStageArgs, "stage">): Promise<SubmitResult> => {
  const hasNewPaperweight = hasPaperweightDetails(values);
  const hadPaperweight = !!currentCustomerForm?.hasPaperweight;

  // ❌ CASE 1: never had paperweight & user didn't enter one
  if (!hadPaperweight && !hasNewPaperweight) {
    return fail(
      "Please provide paperweight quantity and total price before saving this section.",
    );
  }

  // 🧽 CASE 2: had paperweight before, user removed it now → delete
  if (
    hadPaperweight &&
    !hasNewPaperweight &&
    currentCustomerForm?.paperweightId
  ) {
    await pb
      .collection(COLLECTIONS.ORDER_PAPERWEIGHT_ITEMS)
      .delete(currentCustomerForm.paperweightId);

    if (currentCustomerForm.orderId) {
      await pb
        .collection(COLLECTIONS.ORDERS)
        .update(currentCustomerForm.orderId, {
          paperweightOrderId: null,
        });
    }

    return ok();
  }

  // 🔁 CASE 3: had paperweight & still has one → UPDATE
  if (
    hadPaperweight &&
    hasNewPaperweight &&
    currentCustomerForm?.paperweightId
  ) {
    await updatePaperweight({
      id: currentCustomerForm.paperweightId,
      quantity: values.paperweightQuantity as number,
      price: values.paperweightPrice as number,
      paperweightReceived: values.paperweightReceived ?? false,
    });

    return ok();
  }

  // ➕ CASE 4: didn't have paperweight before, user added one → CREATE + link
  if (!hadPaperweight && hasNewPaperweight) {
    if (!currentCustomerForm?.orderId) {
      console.error("Missing orderId when creating paperweight in edit mode");
      return ok();
    }

    const newPaperweight = await pb
      .collection(COLLECTIONS.ORDER_PAPERWEIGHT_ITEMS)
      .create({
        quantity: values.paperweightQuantity,
        price: values.paperweightPrice,
        paperweightReceived: values.paperweightReceived ?? false,
      });

    await pb
      .collection(COLLECTIONS.ORDERS)
      .update(currentCustomerForm.orderId, {
        paperweightOrderId: newPaperweight.id,
      });

    return ok();
  }

  return ok();
};

export const editOrderStage = async ({
  stage,
  values,
  currentCustomerForm,
}: EditOrderStageArgs): Promise<SubmitResult> => {
  switch (stage) {
    case "customer_data":
      return editCustomerStage({ values, currentCustomerForm });
    case "bouquet_data":
      return editBouquetStage({ values, currentCustomerForm });
    case "paperweight_data":
      return editPaperweightStage({ values, currentCustomerForm });
    case "review_data":
      // edit mode shouldn't land here; keep as no-op
      return ok();
    default:
      return ok();
  }
};
