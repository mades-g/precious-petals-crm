import type { FC } from "react";
import * as Form from "@radix-ui/react-form";
import {
  Box,
  Checkbox,
  Flex,
  Select,
  Separator,
  Text,
  TextField,
  Button,
  Popover,
} from "@radix-ui/themes";
import {
  useFormContext,
  useFieldArray,
  Controller,
  useWatch,
} from "react-hook-form";
import { DayPicker } from "react-day-picker";

import {
  FRAME_LAYOUT_OPTIONS,
  FRAME_GLASS_TYPE_OPTIONS,
  FRAME_INCLUSIONS_OPTIONS,
  FRAME_MOUNT_COLOUR_OPTIONS,
  FRAME_PRESERVATION_TYPE_OPTIONS,
  FRAME_TYPE_OPTIONS,
} from "@/services/pb/constants";
import { formatDate } from "@/utils";

import type { CreateOrderFormValues } from "../create-new-customer-form/create-new-customer-form";
import formStyles from "../../form.module.css";
import type { ModalMode } from "../../home";

const MAX_BOUQUETS = 10;

type BouquetDataProps = {
  mode: ModalMode;
  selectedBouquetId?: string | null;
};
const BouquetData: FC<BouquetDataProps> = ({ mode, selectedBouquetId }) => {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<CreateOrderFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "bouquets",
  });

  const bouquetValues = useWatch({ control, name: "bouquets" });

  const canAdd = fields.length < MAX_BOUQUETS;
  const isSingleBouquetView = Boolean(selectedBouquetId);
  const selectedBouquetIndex = selectedBouquetId
    ? bouquetValues?.findIndex((bouquet) => bouquet?.id === selectedBouquetId)
    : -1;
  const visibleIndexes =
    isSingleBouquetView && selectedBouquetIndex >= 0
      ? [selectedBouquetIndex]
      : fields.map((_, index) => index);

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center">
        <Text weight="bold">Bouquets</Text>
        {!isSingleBouquetView && (
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
                preservationDate: "",
                frameType: "",
                framePrice: null,
                mountColour: "",
                mountPrice: null,
                glassEngraving: "",
                glassEngravingPrice: null,
                glassType: "",
                glassPrice: null,
                inclusions: "",
                artworkComplete: false,
                framingComplete: false,
              })
            }
          >
            Add bouquet ({fields.length}/{MAX_BOUQUETS})
          </Button>
        )}
      </Flex>
      {fields.length === 0 && (
        <Text size="1" color="gray">
          No bouquets added yet. Click “Add bouquet” to create one.
        </Text>
      )}
      {visibleIndexes.map((index) => {
        const field = fields[index];
        const prefix = `bouquets.${index}` as const;
        const bouquetErrors = errors.bouquets?.[index] ?? {};
        const glassEngravingValue =
          bouquetValues?.[index]?.glassEngraving ?? "";
        const glassTypeValue = bouquetValues?.[index]?.glassType ?? "";
        const engravingPriceRequired = Boolean(glassEngravingValue.trim());
        const glassPriceRequired = Boolean(glassTypeValue);
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
              {!isSingleBouquetView && (
                <Button
                  type="button"
                  size="1"
                  variant="soft"
                  color="red"
                  onClick={() => remove(index)}
                >
                  Remove
                </Button>
              )}
            </Flex>
            <Flex direction="column" gap="3">
              <Flex direction="row" gap="3" wrap="wrap" justify="between">
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
                <Box minWidth="250px">
                  <Form.Field
                    name={`${prefix}.preservationDate`}
                    className={formStyles.field}
                  >
                    <Form.Label className={formStyles.label} asChild>
                      <Text>Preservation date</Text>
                    </Form.Label>
                    <Form.Control asChild>
                      <Controller
                        name={`${prefix}.preservationDate`}
                        control={control}
                        render={({ field }) => (
                          <Popover.Root>
                            <Popover.Trigger>
                              <Button
                                type="button"
                                variant="outline"
                                size="2"
                                style={{ width: "100%" }}
                              >
                                {field.value
                                  ? formatDate(field.value)
                                  : "Pick date (optional)"}
                              </Button>
                            </Popover.Trigger>
                            <Popover.Content>
                              <DayPicker
                                mode="single"
                                selected={
                                  field.value ? new Date(field.value) : undefined
                                }
                                onSelect={(date) => {
                                  const iso = date
                                    ? date.toISOString().slice(0, 10)
                                    : "";
                                  field.onChange(iso || undefined);
                                }}
                              />
                            </Popover.Content>
                            <input type="hidden" {...field} />
                          </Popover.Root>
                        )}
                      />
                    </Form.Control>
                    {bouquetErrors?.preservationDate && (
                      <Text size="1" color="red">
                        {bouquetErrors.preservationDate.message as string}
                      </Text>
                    )}
                  </Form.Field>
                </Box>
              </Flex>
              <Separator orientation="horizontal" size="4" />
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
              {mode === 'edit' && (
                <>
                  <Separator orientation="horizontal" size="4" />
                  <Flex gap="3" justify="between" direction="row" wrap="wrap">
                    <Box minWidth="250px">
                      <Form.Field
                        name={`${prefix}.glassEngraving`}
                        className={formStyles.field}
                      >
                        <Form.Label className={formStyles.label} asChild>
                          <Text>Glass engraving</Text>
                        </Form.Label>
                        <Form.Control asChild>
                          <TextField.Root
                            {...register(`${prefix}.glassEngraving`)}
                            placeholder='e.g. "Lauren & Simon 18th March 2020"'
                          />
                        </Form.Control>
                      </Form.Field>
                    </Box>
                    <Box>
                      <Form.Field name={`${prefix}.glassEngravingPrice`}>
                        <Form.Label className={formStyles.label} asChild>
                          <Text>Engraving price (£)</Text>
                        </Form.Label>
                        <Form.Control asChild>
                          <TextField.Root
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={!engravingPriceRequired}
                            {...register(`${prefix}.glassEngravingPrice`, {
                              valueAsNumber: true,
                              required: engravingPriceRequired
                                ? "Required"
                                : undefined,
                            })}
                          />
                        </Form.Control>
                        {bouquetErrors?.glassEngravingPrice && (
                          <Text size="1" color="red">
                            {bouquetErrors.glassEngravingPrice.message as string}
                          </Text>
                        )}
                      </Form.Field>
                    </Box>
                  </Flex>
                  <Flex gap="3" justify="between" direction="row" wrap="wrap">
                    <Box minWidth="250px">
                      <Form.Field
                        name={`${prefix}.inclusions`}
                        className={formStyles.field}
                      >
                        <Form.Label className={formStyles.label} asChild>
                          <Text>Inclusions</Text>
                        </Form.Label>
                        <Form.Control asChild>
                          <Controller
                            control={control}
                            name={`${prefix}.inclusions`}
                            render={({ field }) => (
                              <Select.Root
                                value={field.value || ""}
                                onValueChange={field.onChange}
                              >
                                <Select.Trigger placeholder="Inclusions" />
                                <Select.Content>
                                  {FRAME_INCLUSIONS_OPTIONS.map((opt) => (
                                    <Select.Item key={opt} value={opt}>
                                      {opt}
                                    </Select.Item>
                                  ))}
                                </Select.Content>
                              </Select.Root>
                            )}
                          />
                        </Form.Control>
                      </Form.Field>
                    </Box>
                    <Box minWidth="250px">
                      <Form.Field
                        name={`${prefix}.glassType`}
                        className={formStyles.field}
                      >
                        <Form.Label className={formStyles.label} asChild>
                          <Text>Glass type</Text>
                        </Form.Label>
                        <Form.Control asChild>
                          <Controller
                            control={control}
                            name={`${prefix}.glassType`}
                            render={({ field }) => (
                              <Select.Root
                                value={field.value || "none"}
                                onValueChange={(value) =>
                                  field.onChange(value === "none" ? "" : value)
                                }
                              >
                                <Select.Trigger placeholder="Glass type" />
                                <Select.Content>
                                  <Select.Item value="none">None</Select.Item>
                                  {FRAME_GLASS_TYPE_OPTIONS.map((opt) => (
                                    <Select.Item key={opt} value={opt}>
                                      {opt}
                                    </Select.Item>
                                  ))}
                                </Select.Content>
                              </Select.Root>
                            )}
                          />
                        </Form.Control>
                      </Form.Field>
                    </Box>
                    <Box>
                      <Form.Field name={`${prefix}.glassPrice`}>
                        <Form.Label className={formStyles.label} asChild>
                          <Text>Glass price (£)</Text>
                        </Form.Label>
                        <Form.Control asChild>
                          <TextField.Root
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={!glassPriceRequired}
                            {...register(`${prefix}.glassPrice`, {
                              valueAsNumber: true,
                              required: glassPriceRequired ? "Required" : undefined,
                            })}
                          />
                        </Form.Control>
                        {bouquetErrors?.glassPrice && (
                          <Text size="1" color="red">
                            {bouquetErrors.glassPrice.message as string}
                          </Text>
                        )}
                      </Form.Field>
                    </Box>
                  </Flex>
                  <Flex gap="3" justify="between" direction="row" wrap="wrap">
                    <Box minWidth="250px">
                      <Text weight="medium">Completion</Text>
                      <Flex direction="column" gap="2" mt="2">
                        <Controller
                          name={`${prefix}.artworkComplete`}
                          control={control}
                          render={({ field }) => (
                            <Flex align="center" gap="2">
                              <Checkbox
                                checked={!!field.value}
                                onCheckedChange={(checked) =>
                                  field.onChange(!!checked)
                                }
                              />
                              <Text size="1">Artwork complete</Text>
                            </Flex>
                          )}
                        />
                        <Controller
                          name={`${prefix}.framingComplete`}
                          control={control}
                          render={({ field }) => (
                            <Flex align="center" gap="2">
                              <Checkbox
                                checked={!!field.value}
                                onCheckedChange={(checked) =>
                                  field.onChange(!!checked)
                                }
                              />
                              <Text size="1">Framing complete</Text>
                            </Flex>
                          )}
                        />
                      </Flex>
                    </Box>
                  </Flex>
                </>
              )}
            </Flex>
          </Box>
        );
      })}
    </Flex>
  );
};

export default BouquetData;
