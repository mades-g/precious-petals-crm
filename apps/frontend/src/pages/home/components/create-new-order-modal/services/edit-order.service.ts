import { pb } from "@/services/pb/client";
import { COLLECTIONS } from "@/services/pb/constants";
import type {
  CustomersHowRecommendedOptions,
  CustomersTitleOptions,
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
    title: values.title as CustomersTitleOptions | "",
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

  // 🟡 CASE 1: No existing + no new → invalid
  if (existingBouquets.length === 0 && newBouquets.length === 0) {
    return fail("Please add at least one bouquet before saving this section.");
  }

  // 🟠 CASE 2: Existing bouquets, but user removed all in the form → delete all
  if (existingBouquets.length > 0 && newBouquets.length === 0) {
    if (!currentCustomerForm?.orderId) {
      console.error("Missing orderId when deleting bouquets in edit mode");
      return ok();
    }

    await Promise.all(
      existingBouquets
        .filter((bq) => bq.id)
        .map((bq) =>
          pb.collection(COLLECTIONS.ORDER_FRAME_ITEMS).delete(bq.id as string),
        ),
    );

    await pb
      .collection(COLLECTIONS.ORDERS)
      .update(currentCustomerForm.orderId, {
        frameOrderId: [],
      });

    return ok();
  }

  // 🟢 CASE 3: Existing + new → update existing by index, create extra
  if (existingBouquets.length > 0 && newBouquets.length > 0) {
    const minCount = Math.min(existingBouquets.length, newBouquets.length);

    // 3a) UPDATE the overlapping ones
    await Promise.all(
      Array.from({ length: minCount }).map((_, idx) => {
        const existing = existingBouquets[idx];
        const bq = newBouquets[idx];
        if (!existing?.id) return Promise.resolve();

        const payload = mapBouquetToFrameItemPayload(bq);

        // @ts-expect-error - Need to fix this at some point
        return updateBouquet({
          frameId: existing.id,
          ...payload,
        });
      }),
    );

    // 3b) If user added MORE bouquets than existed → CREATE the extras
    if (newBouquets.length > existingBouquets.length) {
      if (!currentCustomerForm?.orderId) {
        console.error(
          "Missing orderId when creating extra bouquets in edit mode",
        );
        return ok();
      }

      const extraBouquets = newBouquets.slice(existingBouquets.length);

      const createdFrameItems = await Promise.all(
        extraBouquets.map((bq, index) => {
          const payload = mapBouquetToFrameItemPayload(bq);
          return pb
            .collection(COLLECTIONS.ORDER_FRAME_ITEMS)
            .create(payload, { requestKey: `extra-${index}` });
        }),
      );

      const existingIds = existingBouquets
        .map((bq) => bq.id)
        .filter(Boolean) as string[];
      const newIds = createdFrameItems.map((fi) => fi.id);

      await pb
        .collection(COLLECTIONS.ORDERS)
        .update(currentCustomerForm.orderId, {
          frameOrderId: [...existingIds, ...newIds],
        });
    }

    return ok();
  }

  // 🔵 CASE 4: No existing, but new bouquets added → create & link to order
  if (existingBouquets.length === 0 && newBouquets.length > 0) {
    if (!currentCustomerForm?.orderId) {
      console.error("Missing orderId when creating bouquets in edit mode");
      return ok();
    }

    const createdFrameItems = await Promise.all(
      newBouquets.map((bq, index) => {
        const payload = mapBouquetToFrameItemPayload(bq);
        return pb
          .collection(COLLECTIONS.ORDER_FRAME_ITEMS)
          .create(payload, { requestKey: `${index}` });
      }),
    );

    await pb
      .collection(COLLECTIONS.ORDERS)
      .update(currentCustomerForm.orderId, {
        frameOrderId: createdFrameItems.map((fi) => fi.id),
      });

    return ok();
  }

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
      "Please provide paperweight quantity and price before saving this section.",
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
    case "costumer_data":
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
