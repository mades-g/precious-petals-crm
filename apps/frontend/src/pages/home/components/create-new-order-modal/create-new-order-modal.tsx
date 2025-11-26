import { useState, type FC } from "react";
import { Dialog, Flex } from "@radix-ui/themes";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import CustomerData from "../customer-data/customer-data";
import BouquetData from "../bouquet-data/bouquet-data";
import PaperWeightData from "../paperweight-data/paperweight-data";
import CreateNewCustomerForm, {
  type CreateOrderFormValues,
} from "../create-new-customer-form/create-new-customer-form";
import ReviewData from "../review-data/review-data";
import ModalFooter from "../modal-footer/modal-footer";
import { createNewOrder } from "@/features/customers/api/create-new-order";

type CreaeNewOrderModalProps = {
  nextOrderNo: string;
  isModalOpen: boolean;
  onCancel: () => void;
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
}) => {
  const [currentFormStage, setCurrentFormStage] =
    useState<FormStage>("costumer_data");

  // Where we want to go after a successful submit (non-review stages)
  const [nextStageAfterSubmit, setNextStageAfterSubmit] =
    useState<FormStage | null>(null);

  // Error specific to final submission on the review screen
  const [submitError, setSubmitError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { mutateAsync: mutateCreateOrder, isPending } = useMutation({
    mutationFn: (values: CreateOrderFormValues) => createNewOrder(values),
    onSuccess: () => {
      // Clear any errors
      setSubmitError(null);
      // Refresh customers list
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      // Close modal + reset wizard state
      handleCancel();
    },
    onError: (error: unknown) => {
      // Surface a friendly error on the review screen
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong while saving the order.";
      setSubmitError(message);
    },
  });

  const handleValidSubmit = async (values: CreateOrderFormValues) => {
    // Clear any previous submit error
    setSubmitError(null);

    // If we're on the review screen, this is our "final submit" path
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

      // ✅ Final order submit via React Query mutation
      await mutateCreateOrder(values);
      return;
    }

    // For non-review stages, this is just “validate and go to next stage”
    if (nextStageAfterSubmit) {
      setCurrentFormStage(nextStageAfterSubmit);
      setNextStageAfterSubmit(null);
    }
  };

  const handleCancel = () => {
    onCancel();
    // Reset wizard state
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
          <Dialog.Title>Create new customer order</Dialog.Title>
          <Dialog.Description>
            Create new customer, frame and/or paperweight order
          </Dialog.Description>
        </Flex>

        <CreateNewCustomerForm
          formId={FORM_ID}
          onValidSubmit={handleValidSubmit}
          defaultValues={{ orderNo: nextOrderNo }}
        >
          {currentFormStage === "costumer_data" && (
            <CustomerData nextOrderNo={nextOrderNo} />
          )}

          {currentFormStage === "bouquet_data" && <BouquetData />}

          {currentFormStage === "paperweight_data" && <PaperWeightData />}

          {currentFormStage === "review_data" && (
            <ReviewData
              onEditCustomer={() => setCurrentFormStage("costumer_data")}
              onEditBouquets={() => setCurrentFormStage("bouquet_data")}
              onEditPaperweight={() => setCurrentFormStage("paperweight_data")}
              submitError={submitError}
            />
          )}
        </CreateNewCustomerForm>

        <ModalFooter
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
        />
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default CreaeNewOrderModal;
