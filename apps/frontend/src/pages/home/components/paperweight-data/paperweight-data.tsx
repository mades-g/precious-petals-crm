import * as Form from "@radix-ui/react-form";
import { type FC } from "react";
import {
  Box,
  Button,
  Flex,
  Text,
  TextField,
  RadioGroup,
} from "@radix-ui/themes";
import { useFormContext, useWatch } from "react-hook-form";

import type { CreateOrderFormValues } from "../create-new-customer-form/create-new-customer-form";
import formStyles from "../create-new-customer-form/create-new-customer-form.module.css";

type PaperWeightDataProps = {
  mode: "create" | "edit";
};

const PaperWeightData: FC<PaperWeightDataProps> = ({ mode }) => {
  const {
    register,
    formState: { errors },
    setValue,
    clearErrors,
  } = useFormContext<CreateOrderFormValues>();

  const hasPaperweight = useWatch({
    name: "hasPaperweight",
  });

  const paperweightReceived = useWatch({
    name: "paperweightReceived",
  });

  const handleTogglePaperweight = () => {
    const next = !hasPaperweight;
    setValue("hasPaperweight", next, { shouldValidate: true });

    if (!next) {
      // If turning off, clear values and errors so they don't pollute review
      setValue("paperweightQuantity", null, { shouldValidate: false });
      setValue("paperweightPrice", null, { shouldValidate: false });
      setValue("paperweightReceived", false, { shouldValidate: false });
      clearErrors(["paperweightQuantity", "paperweightPrice"]);
    }
  };

  return (
    <Flex gap="3" direction="column" justify="start">
      <Flex gap="3" justify="between" direction="row">
        <Flex justify="between" align="center" gap="2" width="100%">
          {!hasPaperweight && (
            <Text size="2" color="gray">
              No paperweight will be included with this order. Click{" "}
              <Text as="span" weight="bold">
                “Add paperweight”
              </Text>{" "}
              if you would like to include one.
            </Text>
          )}
          <Button type="button" size="1" onClick={handleTogglePaperweight}>
            {hasPaperweight ? "Remove" : "Add"} Paperweight
          </Button>
        </Flex>

        {hasPaperweight && (
          <>
            <Box>
              <Form.Field
                name="paperweightQuantity"
                className={formStyles.field}
              >
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
              <Form.Field name="paperweightPrice" className={formStyles.field}>
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
          </>
        )}
      </Flex>
      {mode === "edit" && hasPaperweight && (
        <Flex align="start" justify="center" mb="3">
          <Form.Field name="paperweightReceived" className={formStyles.field}>
            <Form.Label className={formStyles.label} asChild>
              <Text>Paperweight received?</Text>
            </Form.Label>
            <Form.Control asChild>
              <RadioGroup.Root
                value={paperweightReceived ? "yes" : "no"}
                onValueChange={(value) =>
                  setValue("paperweightReceived", value === "yes", {
                    shouldValidate: true,
                  })
                }
              >
                <Flex gap="3">
                  <RadioGroup.Item value="yes">Yes</RadioGroup.Item>
                  <RadioGroup.Item value="no">No</RadioGroup.Item>
                </Flex>
              </RadioGroup.Root>
            </Form.Control>
          </Form.Field>
        </Flex>
      )}
    </Flex>
  );
};

export default PaperWeightData;
