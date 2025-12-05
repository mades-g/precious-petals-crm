import { useState, type FC } from "react";
import { Dialog, Flex } from "@radix-ui/themes";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createNewOrder } from "@/api/create-new-order";

import CustomerData from "../customer-data/customer-data";
import BouquetData from "../bouquet-data/bouquet-data";
import PaperWeightData from "../paperweight-data/paperweight-data";
import CreateNewCustomerForm, {
  type CreateOrderFormValues,
} from "../create-new-customer-form/create-new-customer-form";
import ReviewData from "../review-data/review-data";
import ModalFooter from "../modal-footer/modal-footer";
import { formatSnakeCase } from "@/utils";

import { updateCustomer } from "@/api/update-customer";
import { updateBouquet } from "@/api/update-bouquet";
import { updatePaperweight } from "@/api/update-paperweight";

import { pb } from "@/services/pb/client";
import { COLLECTIONS } from "@/services/pb/constants";
import type {
  CustomersTitleOptions,
  CustomersHowRecommendedOptions,
} from "@/services/pb/types";

// Map bouquet form values to a payload suitable for update/create
const mapBouquetFormToPayload = (bq: any, preservationDate?: string | null) => {
  const sizeX = bq.recommendedSizeWidthIn ?? bq.measuredWidthIn ?? null;
  const sizeY = bq.recommendedSizeHeightIn ?? bq.measuredHeightIn ?? null;

  return {
    price:
      (typeof bq.framePrice === "number" ? bq.framePrice : 0) +
      (typeof bq.mountPrice === "number" ? bq.mountPrice : 0),
    frameType: bq.frameType,
    layout: bq.layout,
    glassType: null,
    frameMountColour: bq.mountColour || null,
    inclusions: null,
    glassEngraving: "",
    sizeX: sizeX != null ? String(sizeX) : "",
    sizeY: sizeY != null ? String(sizeY) : "",
    artistHours: null,
    extras: {
      measuredWidthIn: bq.measuredWidthIn,
      measuredHeightIn: bq.measuredHeightIn,
      recommendedSizeWidthIn: bq.recommendedSizeWidthIn,
      recommendedSizeHeightIn: bq.recommendedSizeHeightIn,
      framePrice: bq.framePrice,
      mountPrice: bq.mountPrice,
    },
    preservationType: bq.preservationType,
    special_notes: "",
    preservationDate: preservationDate || null,
    artworkComplete: false,
    framingComplete: false,
  };
};

const getModalTitle = (
  mode: "create" | "edit",
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

type CreaeNewOrderModalProps = {
  nextOrderNo?: number;
  isModalOpen: boolean;
  onCancel: () => void;
  modalMode: "edit" | "create";
  setCurrentFormStage: React.Dispatch<React.SetStateAction<FormStage>>;
  currentFormStage: FormStage;
  currentCustomerForm: Partial<CreateOrderFormValues> | null;
};

export type FormStage =
  | "costumer_data"
  | "bouquet_data"
  | "paperweight_data"
  | "review_data";

const FORM_ID = "create-new-order-form";

const CreaeNewOrderModal: FC<CreaeNewOrderModalProps> = ({
  isModalOpen,
  nextOrderNo,
  onCancel,
  currentFormStage,
  setCurrentFormStage,
  modalMode,
  currentCustomerForm,
}) => {
  const [nextStageAfterSubmit, setNextStageAfterSubmit] =
    useState<FormStage | null>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { mutateAsync: mutateCreateOrder, isPending } = useMutation({
    mutationFn: (values: CreateOrderFormValues) => createNewOrder(values),
    onSuccess: () => {
      setSubmitError(null);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      handleCancel();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong while saving the order.";
      setSubmitError(message);
    },
  });

  // -----------------------------
  // EDIT MODE: update/create ONLY current formStage
  // -----------------------------
  const handleEditSubmit = async (values: CreateOrderFormValues) => {
    setSubmitError(null);

    switch (currentFormStage) {
      // CUSTOMER + ORDER DATA
      case "costumer_data": {
        if (!currentCustomerForm?.customerId) {
          console.error("Missing customerId for edit mode");
          break;
        }

        // 1) Update CUSTOMER fields
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

        // 2) Update ORDER fields if we have an orderId
        if (currentCustomerForm.orderId) {
          const deliverySameAsBilling = values.deliverySameAsBilling;

          const orderPayload = {
            orderNo: values.orderNo,
            occasionDate: values.occasionDate,

            billingAddressLine1: values.billingAddressLine1,
            billingAddressLine2: values.billingAddressLine2 ?? "",
            billingTown: values.billingTown,
            billingCounty: values.billingCounty ?? "",
            billingPostcode: values.billingPostcode,

            deliverySameAsBilling,

            deliveryAddressLine1: deliverySameAsBilling
              ? values.billingAddressLine1
              : (values.deliveryAddressLine1 ?? ""),
            deliveryAddressLine2: deliverySameAsBilling
              ? (values.billingAddressLine2 ?? "")
              : (values.deliveryAddressLine2 ?? ""),
            deliveryTown: deliverySameAsBilling
              ? values.billingTown
              : (values.deliveryTown ?? ""),
            deliveryCounty: deliverySameAsBilling
              ? (values.billingCounty ?? "")
              : (values.deliveryCounty ?? ""),
            deliveryPostcode: deliverySameAsBilling
              ? values.billingPostcode
              : (values.deliveryPostcode ?? ""),

            preservationDate: values.preservationDate || null,
          };

          await pb
            .collection(COLLECTIONS.ORDERS)
            .update(currentCustomerForm.orderId, orderPayload);
        }

        break;
      }

      // BOUQUET DATA
      case "bouquet_data": {
        const newBouquets = values.bouquets ?? [];
        const existingBouquets = currentCustomerForm?.bouquets ?? [];

        // 🟡 CASE 1: No existing + no new → invalid
        if (existingBouquets.length === 0 && newBouquets.length === 0) {
          setSubmitError(
            "Please add at least one bouquet before saving this section.",
          );
          return; // do not close modal
        }

        // 🟠 CASE 2: Existing bouquets, but user removed all in the form → delete all
        if (existingBouquets.length > 0 && newBouquets.length === 0) {
          if (!currentCustomerForm?.orderId) {
            console.error(
              "Missing orderId when deleting bouquets in edit mode",
            );
            break;
          }

          // Delete all existing frame items
          await Promise.all(
            existingBouquets
              .filter((bq) => bq.id)
              .map((bq) =>
                pb
                  .collection(COLLECTIONS.ORDER_FRAME_ITMES)
                  .delete(bq.id as string),
              ),
          );

          // Clear frameOrderId on the order
          await pb
            .collection(COLLECTIONS.ORDERS)
            .update(currentCustomerForm.orderId, {
              frameOrderId: [],
            });

          break;
        }

        // 🟢 CASE 3: Existing + new → update existing by index, create extra
        if (existingBouquets.length > 0 && newBouquets.length > 0) {
          const minCount = Math.min(
            existingBouquets.length,
            newBouquets.length,
          );

          // 3a) UPDATE the overlapping ones
          await Promise.all(
            Array.from({ length: minCount }).map((_, idx) => {
              const existing = existingBouquets[idx];
              const bq = newBouquets[idx];
              if (!existing?.id) return Promise.resolve();

              const payload = mapBouquetFormToPayload(
                bq,
                values.preservationDate,
              );

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
              break;
            }

            const extraBouquets = newBouquets.slice(existingBouquets.length);

            const createdFrameItems = await Promise.all(
              extraBouquets.map((bq, index) => {
                const payload = mapBouquetFormToPayload(
                  bq,
                  values.preservationDate,
                );
                return pb
                  .collection(COLLECTIONS.ORDER_FRAME_ITMES)
                  .create(payload, { requestKey: `extra-${index}` });
              }),
            );

            // Keep existing ids + new ones
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

          break;
        }

        // 🔵 CASE 4: No existing, but new bouquets added → create & link to order
        if (existingBouquets.length === 0 && newBouquets.length > 0) {
          if (!currentCustomerForm?.orderId) {
            console.error(
              "Missing orderId when creating bouquets in edit mode",
            );
            break;
          }

          const createdFrameItems = await Promise.all(
            newBouquets.map((bq, index) => {
              const payload = mapBouquetFormToPayload(
                bq,
                values.preservationDate,
              );
              return pb
                .collection(COLLECTIONS.ORDER_FRAME_ITMES)
                .create(payload, { requestKey: `${index}` });
            }),
          );

          await pb
            .collection(COLLECTIONS.ORDERS)
            .update(currentCustomerForm.orderId, {
              frameOrderId: createdFrameItems.map((fi) => fi.id),
            });
        }

        break;
      }

      // PAPERWEIGHT DATA
      case "paperweight_data": {
        const hasNewPaperweight =
          values.paperweightQuantity != null && values.paperweightPrice != null;

        const hadPaperweight = !!currentCustomerForm?.hasPaperweight;

        // ❌ CASE 1: never had paperweight & user didn't enter one
        if (!hadPaperweight && !hasNewPaperweight) {
          setSubmitError(
            "Please provide paperweight quantity and price before saving this section.",
          );
          return; // do not close modal
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

          break;
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
        }

        // ➕ CASE 4: didn't have paperweight before, user added one → CREATE + link
        if (!hadPaperweight && hasNewPaperweight) {
          if (!currentCustomerForm?.orderId) {
            console.error(
              "Missing orderId when creating paperweight in edit mode",
            );
            break;
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
        }

        break;
      }

      case "review_data": {
        // In your design, edit mode shouldn't really land on review_data.
        break;
      }
    }

    await queryClient.invalidateQueries({ queryKey: ["customers"] });
    handleCancel();
  };

  const handleValidSubmit = async (values: CreateOrderFormValues) => {
    setSubmitError(null);

    // EDIT MODE: single-stage update
    if (modalMode === "edit") {
      return handleEditSubmit(values);
    }

    // CREATE MODE: final submit on review screen
    if (currentFormStage === "review_data") {
      const hasBouquets = values.bouquets && values.bouquets.length > 0;
      const hasPaperweight = Boolean(
        values.paperweightPrice || values.paperweightQuantity,
      );

      if (!hasBouquets && !hasPaperweight) {
        setSubmitError(
          "Please add at least one bouquet or one paperweight before saving the order.",
        );
        return;
      }

      const orderNo = nextOrderNo ? nextOrderNo + 1 : values.orderNo;

      await mutateCreateOrder({ ...values, orderNo });
      return;
    }

    // CREATE MODE: non-review stages = validate & go to next
    if (nextStageAfterSubmit) {
      setCurrentFormStage(nextStageAfterSubmit);
      setNextStageAfterSubmit(null);
    }
  };

  const handleCancel = () => {
    onCancel();
    setCurrentFormStage("costumer_data");
    setNextStageAfterSubmit(null);
    setSubmitError(null);
  };

  return (
    <Dialog.Root open={isModalOpen}>
      <Dialog.Content
        maxWidth="900px"
        style={{ maxHeight: "80vh", overflowY: "auto" }}
      >
        <Flex direction="column" align="start" mb="3">
          <Dialog.Title>
            {getModalTitle(modalMode, currentFormStage, currentCustomerForm)}
          </Dialog.Title>
          {modalMode === "create" && (
            <Dialog.Description>
              Create new customer, frame and/or paperweight order
            </Dialog.Description>
          )}
        </Flex>

        <CreateNewCustomerForm
          formId={FORM_ID}
          onValidSubmit={handleValidSubmit}
          defaultValues={
            modalMode === "create"
              ? { orderNo: nextOrderNo }
              : { ...currentCustomerForm }
          }
        >
          {currentFormStage === "costumer_data" && (
            <CustomerData nextOrderNo={nextOrderNo} />
          )}

          {currentFormStage === "bouquet_data" && (
            <BouquetData mode={modalMode} />
          )}

          {currentFormStage === "paperweight_data" && (
            <PaperWeightData mode={modalMode} />
          )}

          {modalMode === "create" && currentFormStage === "review_data" && (
            <ReviewData
              onEditCustomer={() => setCurrentFormStage("costumer_data")}
              onEditBouquets={() => setCurrentFormStage("bouquet_data")}
              onEditPaperweight={() => setCurrentFormStage("paperweight_data")}
              submitError={submitError}
            />
          )}
        </CreateNewCustomerForm>

        <ModalFooter
          mode={modalMode}
          currentFormStage={currentFormStage}
          formId={FORM_ID}
          onCancel={handleCancel}
          onGoBack={(stage) => {
            setCurrentFormStage(stage);
            setNextStageAfterSubmit(null);
            setSubmitError(null);
          }}
          onSubmitAndGo={(stage) => {
            setNextStageAfterSubmit(stage);
            setSubmitError(null);
          }}
          isSubmitting={isPending}
          currentCustomerForm={currentCustomerForm}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default CreaeNewOrderModal;
