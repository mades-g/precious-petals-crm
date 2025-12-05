import * as Form from "@radix-ui/react-form";
import {
  Box,
  Flex,
  Select,
  Separator,
  Text,
  TextField,
  Button,
} from "@radix-ui/themes";
import { useFormContext, useFieldArray, Controller } from "react-hook-form";

import {
  FRAME_LAYOUT_OPTIONS,
  FRAME_MOUNT_COLOUR_OPTIONS,
  FRAME_PRESERVATION_TYPE_OPTIONS,
  FRAME_TYPE_OPTIONS,
} from "@/services/pb/constants";

import type { CreateOrderFormValues } from "../create-new-customer-form/create-new-customer-form";
import formStyles from "../create-new-customer-form/create-new-customer-form.module.css";
import type { FC } from "react";

const MAX_BOUQUETS = 10;

type BouquetDataProps = {
  mode: "create" | "edit";
};
const BouquetData: FC<BouquetDataProps> = () => {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<CreateOrderFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "bouquets",
  });

  const canAdd = fields.length < MAX_BOUQUETS;

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center">
        <Text weight="bold">Bouquets</Text>
        <Button
          type="button"
          size="1"
          disabled={!canAdd}
          onClick={() =>
            append({
              measuredWidthIn: null,
              measuredHeightIn: null,
              layout: "",
              recommendedSizeWidthIn: null,
              recommendedSizeHeightIn: null,
              preservationType: "",
              frameType: "",
              framePrice: null,
              mountColour: "",
              mountPrice: null, // ✅ new
            })
          }
        >
          Add bouquet ({fields.length}/{MAX_BOUQUETS})
        </Button>
      </Flex>

      {fields.length === 0 && (
        <Text size="1" color="gray">
          No bouquets added yet. Click “Add bouquet” to create one.
        </Text>
      )}

      {fields.map((field, index) => {
        const prefix = `bouquets.${index}` as const;
        const bouquetErrors = errors.bouquets?.[index] ?? {};

        return (
          <Box
            key={field.id}
            style={{
              borderRadius: 8,
              border: "1px solid var(--gray-5)",
              padding: 12,
            }}
          >
            <Flex justify="between" align="center" mb="2">
              <Text weight="medium">Bouquet #{index + 1}</Text>
              <Button
                type="button"
                size="1"
                variant="soft"
                color="red"
                onClick={() => remove(index)}
              >
                Remove
              </Button>
            </Flex>

            <Flex direction="column" gap="3">
              <Flex direction="row" gap="3" wrap="wrap" justify="between">
                {/* Measured size */}
                <Box>
                  <Form.Field
                    name={`${prefix}.measuredSize`}
                    className={formStyles.field}
                  >
                    <Form.Label className={formStyles.label} asChild>
                      <Text>
                        <Text color="red">*</Text> Measured size (in)
                      </Text>
                    </Form.Label>
                    <Flex gap="3" align="center">
                      <Text size="1">X</Text>
                      <Form.Control asChild>
                        <TextField.Root
                          type="number"
                          min="0"
                          {...register(`${prefix}.measuredWidthIn`, {
                            valueAsNumber: true,
                            required: "Required",
                          })}
                        />
                      </Form.Control>
                      <Text size="1">Y</Text>
                      <Form.Control asChild>
                        <TextField.Root
                          type="number"
                          min="0"
                          {...register(`${prefix}.measuredHeightIn`, {
                            valueAsNumber: true,
                            required: "Required",
                          })}
                        />
                      </Form.Control>
                    </Flex>
                    {(bouquetErrors?.measuredWidthIn ||
                      bouquetErrors?.measuredHeightIn) && (
                      <Text size="1" color="red">
                        Both dimensions are required
                      </Text>
                    )}
                  </Form.Field>
                </Box>

                {/* Layout */}
                <Box minWidth="250px">
                  <Form.Field
                    name={`${prefix}.layout`}
                    className={formStyles.field}
                  >
                    <Form.Label className={formStyles.label} asChild>
                      <Text>
                        <Text color="red">*</Text> Layout
                      </Text>
                    </Form.Label>
                    <Form.Control asChild>
                      <Controller
                        control={control}
                        name={`${prefix}.layout`}
                        rules={{ required: "Layout is required" }}
                        render={({ field }) => (
                          <Select.Root
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          >
                            <Select.Trigger placeholder="Layout" />
                            <Select.Content>
                              {FRAME_LAYOUT_OPTIONS.map((opt) => (
                                <Select.Item key={opt} value={opt}>
                                  {opt}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        )}
                      />
                    </Form.Control>
                    {bouquetErrors?.layout && (
                      <Text size="1" color="red">
                        {bouquetErrors.layout.message as string}
                      </Text>
                    )}
                  </Form.Field>
                </Box>

                {/* Recommended size */}
                <Box>
                  <Form.Field
                    name={`${prefix}.recommendedSize`}
                    className={formStyles.field}
                  >
                    <Form.Label className={formStyles.label} asChild>
                      <Text>
                        <Text color="red">*</Text> Recommended frame size (in)
                      </Text>
                    </Form.Label>
                    <Flex gap="3" align="center">
                      <Text size="1">X</Text>
                      <Form.Control asChild>
                        <TextField.Root
                          type="number"
                          min="0"
                          {...register(`${prefix}.recommendedSizeWidthIn`, {
                            valueAsNumber: true,
                            required: "Required",
                          })}
                        />
                      </Form.Control>
                      <Text size="1">Y</Text>
                      <Form.Control asChild>
                        <TextField.Root
                          type="number"
                          min="0"
                          {...register(`${prefix}.recommendedSizeHeightIn`, {
                            valueAsNumber: true,
                            required: "Required",
                          })}
                        />
                      </Form.Control>
                    </Flex>
                    {(bouquetErrors?.recommendedSizeWidthIn ||
                      bouquetErrors?.recommendedSizeHeightIn) && (
                      <Text size="1" color="red">
                        Both dimensions are required
                      </Text>
                    )}
                  </Form.Field>
                </Box>

                {/* Preservation type */}
                <Box minWidth="250px">
                  <Form.Field
                    name={`${prefix}.preservationType`}
                    className={formStyles.field}
                  >
                    <Form.Label className={formStyles.label} asChild>
                      <Text>
                        <Text color="red">*</Text> Preservation type
                      </Text>
                    </Form.Label>
                    <Form.Control asChild>
                      <Controller
                        control={control}
                        name={`${prefix}.preservationType`}
                        rules={{ required: "Preservation type is required" }}
                        render={({ field }) => (
                          <Select.Root
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          >
                            <Select.Trigger placeholder="Preservation type" />
                            <Select.Content>
                              {FRAME_PRESERVATION_TYPE_OPTIONS.map((opt) => (
                                <Select.Item key={opt} value={opt}>
                                  {opt}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        )}
                      />
                    </Form.Control>
                    {bouquetErrors?.preservationType && (
                      <Text size="1" color="red">
                        {bouquetErrors.preservationType.message as string}
                      </Text>
                    )}
                  </Form.Field>
                </Box>
              </Flex>

              <Separator orientation="horizontal" size="4" />

              {/* Frame type + price */}
              <Flex gap="3" justify="between" direction="row">
                <Box minWidth="250px">
                  <Form.Field
                    name={`${prefix}.frameType`}
                    className={formStyles.field}
                  >
                    <Form.Label className={formStyles.label} asChild>
                      <Text>
                        <Text color="red">*</Text> Recommended Frame type
                      </Text>
                    </Form.Label>
                    <Form.Control asChild>
                      <Controller
                        control={control}
                        name={`${prefix}.frameType`}
                        rules={{ required: "Frame type is required" }}
                        render={({ field }) => (
                          <Select.Root
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          >
                            <Select.Trigger placeholder="Frame type" />
                            <Select.Content>
                              {FRAME_TYPE_OPTIONS.map((opt) => (
                                <Select.Item key={opt} value={opt}>
                                  {opt}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        )}
                      />
                    </Form.Control>
                    {bouquetErrors?.frameType && (
                      <Text size="1" color="red">
                        {bouquetErrors.frameType.message as string}
                      </Text>
                    )}
                  </Form.Field>
                </Box>

                <Box>
                  <Form.Field name={`${prefix}.framePrice`}>
                    <Form.Label className={formStyles.label} asChild>
                      <Text>
                        <Text color="red">*</Text> Frame price (£)
                      </Text>
                    </Form.Label>
                    <Form.Control asChild>
                      <TextField.Root
                        type="number"
                        min="0"
                        step="0.01"
                        {...register(`${prefix}.framePrice`, {
                          valueAsNumber: true,
                          required: "Required",
                        })}
                      />
                    </Form.Control>
                    {bouquetErrors?.framePrice && (
                      <Text size="1" color="red">
                        {bouquetErrors.framePrice.message as string}
                      </Text>
                    )}
                  </Form.Field>
                </Box>
              </Flex>

              <Separator orientation="horizontal" size="4" />

              {/* Mount colour + mount price */}
              <Flex gap="3" justify="between" direction="row">
                <Box minWidth="250px">
                  <Form.Field
                    name={`${prefix}.mountColour`}
                    className={formStyles.field}
                  >
                    <Form.Label className={formStyles.label} asChild>
                      <Text>
                        <Text color="red">*</Text> Recommended Mount colour
                      </Text>
                    </Form.Label>
                    <Form.Control asChild>
                      <Controller
                        control={control}
                        name={`${prefix}.mountColour`}
                        rules={{ required: "Mount colour is required" }}
                        render={({ field }) => (
                          <Select.Root
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          >
                            <Select.Trigger placeholder="Mount colour" />
                            <Select.Content>
                              {FRAME_MOUNT_COLOUR_OPTIONS.map((opt) => (
                                <Select.Item key={opt} value={opt}>
                                  {opt}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        )}
                      />
                    </Form.Control>
                    {bouquetErrors?.mountColour && (
                      <Text size="1" color="red">
                        {bouquetErrors.mountColour.message as string}
                      </Text>
                    )}
                  </Form.Field>
                </Box>

                <Box>
                  <Form.Field name={`${prefix}.mountPrice`}>
                    <Form.Label className={formStyles.label} asChild>
                      <Text>
                        <Text color="red">*</Text> Mount price (£)
                      </Text>
                    </Form.Label>
                    <Form.Control asChild>
                      <TextField.Root
                        type="number"
                        min="0"
                        step="0.01"
                        {...register(`${prefix}.mountPrice`, {
                          valueAsNumber: true,
                          required: "Required",
                        })}
                      />
                    </Form.Control>
                    {bouquetErrors?.mountPrice && (
                      <Text size="1" color="red">
                        {bouquetErrors.mountPrice.message as string}
                      </Text>
                    )}
                  </Form.Field>
                </Box>
              </Flex>
            </Flex>
          </Box>
        );
      })}
    </Flex>
  );
};

export default BouquetData;
