import * as Form from "@radix-ui/react-form"
import { Box, Flex, Text, TextField } from "@radix-ui/themes"
import { useFormContext } from "react-hook-form"

import type { CreateOrderFormValues } from "../create-new-customer-form/create-new-customer-form"
import formStyles from "../create-new-customer-form/create-new-customer-form.module.css"

const PaperWeightData = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<CreateOrderFormValues>()

  return (
    <Flex gap="3" justify="between" direction="row">
      <Box>
        <Form.Field name="paperweightQuantity" className={formStyles.field}>
          <Form.Label className={formStyles.label} asChild>
            <Text>
              <Text color="red">*</Text> Quantity
            </Text>
          </Form.Label>
          <Form.Control asChild>
            <TextField.Root
              type="number"
              min="0"
              step="1"
              {...register("paperweightQuantity", {
                valueAsNumber: true,
                required: "Quantity is required",
                min: { value: 1, message: "At least 1" },
              })}
            />
          </Form.Control>
          {errors.paperweightQuantity && (
            <Text size="1" color="red">
              {errors.paperweightQuantity.message}
            </Text>
          )}
        </Form.Field>
      </Box>
      <Box>
        <Form.Field name="paperweightPrice">
          <Form.Label className={formStyles.label} asChild>
            <Text>
              <Text color="red">*</Text> Price (£)
            </Text>
          </Form.Label>
          <Form.Control asChild>
            <TextField.Root
              type="number"
              min="0"
              step="0.01"
              className={formStyles.input}
              {...register("paperweightPrice", {
                valueAsNumber: true,
                required: "Price is required",
              })}
            />
          </Form.Control>
          {errors.paperweightPrice && (
            <Text size="1" color="red">
              {errors.paperweightPrice.message}
            </Text>
          )}
        </Form.Field>
      </Box>
    </Flex>
  )
}

export default PaperWeightData
