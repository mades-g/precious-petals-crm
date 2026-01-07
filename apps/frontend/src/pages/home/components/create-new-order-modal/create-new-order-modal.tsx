import { useState, type FC } from "react";
import { Dialog, Flex } from "@radix-ui/themes";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createNewOrder } from "@/api/create-new-order";
import { hasPaperweightDetails } from "@/api/mappers/paperweight.mapper";

import CustomerData from "../customer-data/customer-data";
import BouquetData from "../bouquet-data/bouquet-data";
import PaperWeightData from "../paperweight-data/paperweight-data";
import CreateNewCustomerForm, {
  type CreateOrderFormValues,
} from "../create-new-customer-form/create-new-customer-form";
import ReviewData from "../review-data/review-data";
import ModalFooter from "../modal-footer/modal-footer";

import { getModalTitle } from "./create-new-order-modal.utils";
import { editOrderStage } from "./services/edit-order.service";
import type { ModalMode } from "../../home";

export type FormStage =
  | "costumer_data"
  | "bouquet_data"
  | "paperweight_data"
  | "review_data";

const FORM_ID = "create-new-order-form";

type CreateNewOrderModalProps = {
  nextOrderNo?: number;
  isModalOpen: boolean;
  onCancel: () => void;
  modalMode: ModalMode;
  setCurrentFormStage: React.Dispatch<React.SetStateAction<FormStage>>;
  currentFormStage: FormStage;
  currentCustomerForm: Partial<CreateOrderFormValues> | null;
};

const CreateNewOrderModal: FC<CreateNewOrderModalProps> = ({
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

  const handleCancel = () => {
    onCancel();
    setCurrentFormStage("costumer_data");
    setNextStageAfterSubmit(null);
    setSubmitError(null);
  };

  const submitEdit = async (values: CreateOrderFormValues) => {
    const result = await editOrderStage({
      stage: currentFormStage,
      values,
      currentCustomerForm,
    });

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["customers"] });
    handleCancel();
  };

  const submitCreateFinal = async (values: CreateOrderFormValues) => {
    const hasBouquets = (values.bouquets?.length ?? 0) > 0;
    const hasPaperweight = hasPaperweightDetails(values);

    if (!hasBouquets && !hasPaperweight) {
      setSubmitError(
        "Please add at least one bouquet or one paperweight before saving the order.",
      );
      return;
    }

    const orderNo = nextOrderNo ? 0 : values.orderNo;
    await mutateCreateOrder({ ...values, orderNo });
  };

  const advanceStageIfNeeded = () => {
    if (!nextStageAfterSubmit) return;
    setCurrentFormStage(nextStageAfterSubmit);
    setNextStageAfterSubmit(null);
  };

  const handleValidSubmit = async (values: CreateOrderFormValues) => {
    setSubmitError(null);

    if (modalMode === "edit") {
      await submitEdit(values);
      return;
    }

    if (currentFormStage === "review_data") {
      await submitCreateFinal(values);
      return;
    }

    advanceStageIfNeeded();
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

export default CreateNewOrderModal;
