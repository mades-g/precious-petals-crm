import { useState, type FC } from "react"
import { Dialog, Flex, Box, Button } from "@radix-ui/themes"

import CustomerData from "../customer-data/customer-data"
import BouquetData from "../bouquet-data/bouquet-data"
import PaperWeightData from "../paperweight-data/paperweight-data"
import CreateNewCustomerForm, {
  type CreateOrderFormValues,
} from "../create-new-customer-form/create-new-customer-form"
import ReviewData from "../review-data/review-data"

type CreaeNewOrderModalProps = {
  nextOrderNo: string
  isModalOpen: boolean
  onCancel: () => void
}

export type FormStage =
  | "costumer_data"
  | "bouquet_data"
  | "paperweight_data"
  | "review_data"

const FORM_ID = "create-new-order-form"

const CreaeNewOrderModal: FC<CreaeNewOrderModalProps> = ({
  isModalOpen,
  nextOrderNo,
  onCancel,
}) => {
  const [currentFormStage, setCurrentFormStage] =
    useState<FormStage>("costumer_data")

  const [nextStageAfterSubmit, setNextStageAfterSubmit] =
    useState<FormStage | null>(null)

  const handleValidSubmit = (values: CreateOrderFormValues) => {
    console.log("Form values:", values)

    if (nextStageAfterSubmit) {
      setCurrentFormStage(nextStageAfterSubmit)
      setNextStageAfterSubmit(null)
    }

    // call api and stuff
  }

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
            />
          )}
        </CreateNewCustomerForm>
        {/* Move this footer to it's own component */}
        <Box mt="4">
          <Flex justify="between" align="center">
            <Button
              variant="soft"
              color="gray"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </Button>
            {currentFormStage === "costumer_data" && (
              <Flex justify="end" gap="2">
                <Button
                  type="submit"
                  form={FORM_ID}
                  onClick={() => setNextStageAfterSubmit("bouquet_data")}
                >
                  Add bouquet
                </Button>

                <Button
                  type="submit"
                  form={FORM_ID}
                  onClick={() => setNextStageAfterSubmit("paperweight_data")}
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
                  onClick={() => setCurrentFormStage("costumer_data")}
                >
                  Back to customer
                </Button>
                <Button
                  type="submit"
                  form={FORM_ID}
                  onClick={() => setNextStageAfterSubmit("paperweight_data")}
                >
                  Next: Paperweight
                </Button>
              </Flex>
            )}
            {currentFormStage === "paperweight_data" && (
              <Flex justify="end" gap="2">
                <Button
                  type="button"
                  variant="soft"
                  color="gray"
                  onClick={() => setCurrentFormStage("bouquet_data")}
                >
                  Back to bouquet
                </Button>
                <Button
                  type="submit"
                  form={FORM_ID}
                  onClick={() => setNextStageAfterSubmit("review_data")}
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
                  onClick={() => setCurrentFormStage("paperweight_data")}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  form={FORM_ID}
                  onClick={() => setNextStageAfterSubmit("review_data")}
                >
                  Confirm & Save
                </Button>
              </Flex>
            )}
          </Flex>
        </Box>
      </Dialog.Content>
    </Dialog.Root>
  )
}

export default CreaeNewOrderModal
