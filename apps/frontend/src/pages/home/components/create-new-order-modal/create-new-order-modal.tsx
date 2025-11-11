import { useState, type FC } from "react"
import { Box, Button, Dialog, Flex, Heading } from "@radix-ui/themes"

import CreateNewCustomerForm from "../create-new-customer-form/create-new-customer-form"
import CustomerData from "../customer-data/customer-data"
import BouquetData from "../bouquet-data/bouquet-data"
import PaperWeightData from "../paperweight-data/paperweight-data"

type CreaeNewOrderModalProps = {
  nextOrderNo: string
  isModalOpen: boolean
  onCancel: () => void
}

type FormStage =
  | "costumer_data"
  | "bouquet_data"
  | "paperweight_data"
  | "review_data"

const STEPS_DIALOG_CONFIG: {
  id: FormStage
  label: string
  description: string
}[] = [
    {
      id: "costumer_data",
      label: "Customer details",
      description: "Add customer details",
    },
    { id: "bouquet_data", label: "Bouquet", description: "Add bouquet data" },
    {
      id: "paperweight_data",
      label: "Paperweight",
      description: "Add paperweight data",
    },
    { id: "review_data", label: "Review", description: "Review and save date" },
  ]

const FORM_ID = "create-new-order-form"

const CreaeNewOrderModal: FC<CreaeNewOrderModalProps> = ({
  isModalOpen,
  nextOrderNo,
  onCancel
}) => {
  const [currentFormStage, setCurrentFormStage] =
    useState<FormStage>("costumer_data")
  const [nextStageAfterSubmit, setNextStageAfterSubmit] =
    useState<FormStage | null>(null)
  const currentStepDialogConfig = STEPS_DIALOG_CONFIG.find(
    (step) => step.id === currentFormStage,
  )

  return (
    <Dialog.Root open={isModalOpen}>
      <Dialog.Content
        maxWidth="900px"
        style={{ maxHeight: "80vh", overflowY: "auto" }}
      >
        <Flex direction="column" align="start" mb="2">
          <Heading>Create new customer order</Heading>
          <Dialog.Description>
            {currentStepDialogConfig?.description}
          </Dialog.Description>
        </Flex>
        <CreateNewCustomerForm>
          {currentFormStage === "costumer_data" && (
            <CustomerData nextOrderNo={nextOrderNo} />
          )}
          {currentFormStage === "bouquet_data" && <BouquetData />}
          {currentFormStage === "paperweight_data" && <PaperWeightData />}
          {currentFormStage === "review_data" && <h1>review data</h1>}
        </CreateNewCustomerForm>
        <Box mt="4">
          <Flex justify="between">
            <Button
              variant="soft"
              color="gray"
              type="button"
              onClick={() => onCancel()}
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
          </Flex>
        </Box>
      </Dialog.Content>
    </Dialog.Root>
  )
}

export default CreaeNewOrderModal
