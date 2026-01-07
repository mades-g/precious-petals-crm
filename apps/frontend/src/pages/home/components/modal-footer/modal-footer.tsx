import { Box, Button, Flex } from "@radix-ui/themes";
import type { FormStage } from "../create-new-order-modal/create-new-order-modal";
import type { CreateOrderFormValues } from "../create-new-customer-form/create-new-customer-form";
import type { ModalMode } from "../../home";

const getSubmitBtnTitle = (
  currentCustomerForm: Partial<CreateOrderFormValues> | null,
  formStage: FormStage,
) => {
  let title = "Create";

  if (currentCustomerForm) {
    if (
      formStage === "paperweight_data" &&
      currentCustomerForm.hasPaperweight
    ) {
      title = "Update changes";
    }
    if (formStage === "bouquet_data" && currentCustomerForm.bouquets?.length) {
      title = "Update changes";
    }
    if (formStage === "costumer_data") {
      title = "Update changes";
    }
  }

  return title;
};

type ModalFooterProps = {
  currentFormStage: FormStage;
  onCancel: () => void;
  onGoBack: (stage: FormStage) => void;
  onSubmitAndGo: (stage: FormStage) => void;
  formId: string;
  isSubmitting?: boolean;
  mode: ModalMode;
  currentCustomerForm: Partial<CreateOrderFormValues> | null;
};

const ModalFooter: React.FC<ModalFooterProps> = ({
  currentFormStage,
  onCancel,
  onGoBack,
  onSubmitAndGo,
  formId,
  isSubmitting = false,
  mode,
  currentCustomerForm,
}) => (
  <Box mt="4">
    <Flex justify="between" align="center">
      <Button
        variant="soft"
        color="gray"
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        Cancel
      </Button>

      {mode === "create" && (
        <>
          {currentFormStage === "costumer_data" && (
            <Flex justify="end" gap="2">
              <Button
                type="submit"
                form={formId}
                onClick={() => onSubmitAndGo("bouquet_data")}
                disabled={isSubmitting}
              >
                Add bouquet
              </Button>
              <Button
                type="submit"
                form={formId}
                onClick={() => onSubmitAndGo("paperweight_data")}
                disabled={isSubmitting}
              >
                Add paperweight
              </Button>
            </Flex>
          )}

          {currentFormStage === "bouquet_data" && (
            <Flex justify="end" gap="2">
              <Button
                type="button"
                variant="soft"
                color="gray"
                onClick={() => onGoBack("costumer_data")}
                disabled={isSubmitting}
              >
                Back to customer
              </Button>
              <Button
                type="submit"
                form={formId}
                onClick={() => onSubmitAndGo("paperweight_data")}
                disabled={isSubmitting}
              >
                Next: Paperweight
              </Button>
              <Button
                type="submit"
                form={formId}
                onClick={() => onSubmitAndGo("review_data")}
                disabled={isSubmitting}
              >
                Review order
              </Button>
            </Flex>
          )}

          {currentFormStage === "paperweight_data" && (
            <Flex justify="end" gap="2">
              <Button
                type="button"
                variant="soft"
                color="gray"
                onClick={() => onGoBack("bouquet_data")}
                disabled={isSubmitting}
              >
                Back to bouquet
              </Button>
              <Button
                type="submit"
                form={formId}
                onClick={() => onSubmitAndGo("review_data")}
                disabled={isSubmitting}
              >
                Review order
              </Button>
            </Flex>
          )}

          {currentFormStage === "review_data" && (
            <Flex justify="end" gap="2">
              <Button
                type="button"
                variant="soft"
                color="gray"
                onClick={() => onGoBack("paperweight_data")}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                type="submit"
                form={formId}
                onClick={() => onSubmitAndGo("review_data")}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Confirm & Save"}
              </Button>
            </Flex>
          )}
        </>
      )}

      {mode === "edit" && (
        <Flex justify="end" gap="2">
          <Button type="submit" form={formId} disabled={isSubmitting}>
            {getSubmitBtnTitle(currentCustomerForm, currentFormStage)}
          </Button>
        </Flex>
      )}
    </Flex>
  </Box>
);

export default ModalFooter;
