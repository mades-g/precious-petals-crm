import type { FC } from "react";
import { FormControl, FormField, FormLabel } from "@radix-ui/react-form";
import {
  Box,
  TextField,
  Text,
  Flex,
  Select,
  Checkbox,
  Button,
  Popover,
} from "@radix-ui/themes";
import { useFormContext, Controller } from "react-hook-form";
import { DayPicker } from "react-day-picker";

import {
  CUSTOMERS_HOW_RECOMMENDED_OPTIONS,
  CUSTOMERS_TITLE_OPTIONS,
} from "@/services/pb/constants";
import { formatDate } from "@/utils";

import type { CreateOrderFormValues } from "../create-new-customer-form/create-new-customer-form";
import formStyles from "../../form.module.css";

type CustomerDataProps = {
  nextOrderNo?: number;
};

const CustomerData: FC<CustomerDataProps> = ({ nextOrderNo }) => {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<CreateOrderFormValues>();

  const deliverySameAsBilling = watch("deliverySameAsBilling");

  return (
    <Flex gap="3" direction="column">
      {/* Order number (only shown if there's no auto-generated order no) */}
      {!nextOrderNo && (
        <Flex>
          <Box maxWidth="100px">
            <FormField name="orderNo" className={formStyles.field}>
              <FormLabel className={formStyles.label} asChild>
                <Text>
                  <Text color="red">*</Text> Order No
                </Text>
              </FormLabel>
              <FormControl asChild>
                <TextField.Root
                  type="number"
                  {...register("orderNo", {
                    required: "Order No is required",
                    min: { message: "Min 1", value: 1 },
                    valueAsNumber: true,
                  })}
                />
              </FormControl>
              {errors.orderNo && (
                <Text size="1" color="red">
                  {errors.orderNo.message as string}
                </Text>
              )}
            </FormField>
          </Box>
        </Flex>
      )}
      <Flex gap="3">
        <Box minWidth="70px">
          <FormField name="title" className={formStyles.field}>
            <FormLabel className={formStyles.label} asChild>
              <Text>
                <Text color="red">*</Text> Title
              </Text>
            </FormLabel>
            <FormControl asChild>
              <Controller
                name="title"
                control={control}
                rules={{ required: "Title is required" }}
                render={({ field }) => (
                  <Select.Root
                    value={field.value || ""}
                    onValueChange={field.onChange}
                  >
                    <Select.Trigger placeholder="Title" />
                    <Select.Content>
                      {CUSTOMERS_TITLE_OPTIONS.map((opt) => (
                        <Select.Item key={opt} value={opt}>
                          {opt}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                )}
              />
            </FormControl>
            {errors.title && (
              <Text size="1" color="red">
                {errors.title.message as string}
              </Text>
            )}
          </FormField>
        </Box>
        <Box flexGrow="1" minWidth="200px">
          <FormField name="firstName" className={formStyles.field}>
            <FormLabel className={formStyles.label} asChild>
              <Text>
                <Text color="red">*</Text> First name
              </Text>
            </FormLabel>
            <FormControl asChild>
              <TextField.Root
                placeholder="First name"
                {...register("firstName", {
                  required: "First name is required",
                })}
              />
            </FormControl>
            {errors.firstName && (
              <Text size="1" color="red">
                {errors.firstName.message as string}
              </Text>
            )}
          </FormField>
        </Box>
        <Box flexGrow="1" minWidth="200px">
          <FormField name="surname" className={formStyles.field}>
            <FormLabel className={formStyles.label} asChild>
              <Text>
                <Text color="red">*</Text> Surname
              </Text>
            </FormLabel>
            <FormControl asChild>
              <TextField.Root
                placeholder="Surname"
                {...register("surname", {
                  required: "Surname is required",
                })}
              />
            </FormControl>
            {errors.surname && (
              <Text size="1" color="red">
                {errors.surname.message as string}
              </Text>
            )}
          </FormField>
        </Box>
      </Flex>
      <Flex gap="3">
        <Box flexGrow="1" minWidth="220px">
          <FormField name="email" className={formStyles.field}>
            <FormLabel className={formStyles.label} asChild>
              <Text>
                <Text color="red">*</Text> Email
              </Text>
            </FormLabel>
            <FormControl asChild>
              <TextField.Root
                type="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: "Please enter a valid email",
                  },
                })}
              />
            </FormControl>
            {errors.email && (
              <Text size="1" color="red">
                {errors.email.message as string}
              </Text>
            )}
          </FormField>
        </Box>
        <Box flexGrow="1" minWidth="180px">
          <FormField name="telephone" className={formStyles.field}>
            <FormLabel className={formStyles.label} asChild>
              <Text>
                <Text color="red">*</Text> Telephone
              </Text>
            </FormLabel>
            <FormControl asChild>
              <TextField.Root
                {...register("telephone", {
                  required: "Telephone is required",
                  pattern: {
                    value: /^(?:0|\+44)(?:\d\s?){9,10}$/,
                    message: "Please enter a valid UK number",
                  },
                })}
              />
            </FormControl>
            {errors.telephone && (
              <Text size="1" color="red">
                {errors.telephone.message as string}
              </Text>
            )}
          </FormField>
        </Box>
        <Box flexGrow="1" minWidth="220px">
          <FormField name="howRecommended" className={formStyles.field}>
            <FormLabel className={formStyles.label} asChild>
              <Text>
                <Text color="red">*</Text> How recommended
              </Text>
            </FormLabel>
            <FormControl asChild>
              <Controller
                name="howRecommended"
                control={control}
                rules={{ required: "Please select a source" }}
                render={({ field }) => (
                  <Select.Root
                    value={field.value || ""}
                    onValueChange={field.onChange}
                  >
                    <Select.Trigger placeholder="Select source" />
                    <Select.Content>
                      {CUSTOMERS_HOW_RECOMMENDED_OPTIONS.map((opt) => (
                        <Select.Item key={opt} value={opt}>
                          {opt}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                )}
              />
            </FormControl>
            {errors.howRecommended && (
              <Text size="1" color="red">
                {errors.howRecommended.message as string}
              </Text>
            )}
          </FormField>
        </Box>
      </Flex>
      {/* Billing address */}
      <Flex direction="column" gap="2" mt="2">
        <Text weight="bold">Billing address</Text>
        <Flex gap="3">
          <Box flexGrow="1" minWidth="260px">
            <FormField name="billingAddressLine1" className={formStyles.field}>
              <FormLabel className={formStyles.label} asChild>
                <Text>
                  <Text color="red">*</Text> Address line 1
                </Text>
              </FormLabel>
              <FormControl asChild>
                <TextField.Root
                  placeholder="Address line 1"
                  {...register("billingAddressLine1", {
                    required: "Billing address line 1 is required",
                  })}
                />
              </FormControl>
              {errors.billingAddressLine1 && (
                <Text size="1" color="red">
                  {errors.billingAddressLine1.message as string}
                </Text>
              )}
            </FormField>
          </Box>
          <Box flexGrow="1" minWidth="260px">
            <FormField name="billingAddressLine2" className={formStyles.field}>
              <FormLabel className={formStyles.label} asChild>
                <Text>Address line 2</Text>
              </FormLabel>
              <FormControl asChild>
                <TextField.Root
                  placeholder="Address line 2 (optional)"
                  {...register("billingAddressLine2")}
                />
              </FormControl>
            </FormField>
          </Box>
        </Flex>
        <Flex gap="3">
          <Box flexGrow="1" minWidth="200px">
            <FormField name="billingTown" className={formStyles.field}>
              <FormLabel className={formStyles.label} asChild>
                <Text>
                  <Text color="red">*</Text> Town
                </Text>
              </FormLabel>
              <FormControl asChild>
                <TextField.Root
                  placeholder="Town"
                  {...register("billingTown", {
                    required: "Billing town is required",
                  })}
                />
              </FormControl>
              {errors.billingTown && (
                <Text size="1" color="red">
                  {errors.billingTown.message as string}
                </Text>
              )}
            </FormField>
          </Box>
          <Box flexGrow="1" minWidth="200px">
            <FormField name="billingCounty" className={formStyles.field}>
              <FormLabel className={formStyles.label} asChild>
                <Text>County</Text>
              </FormLabel>
              <FormControl asChild>
                <TextField.Root
                  placeholder="County (optional)"
                  {...register("billingCounty")}
                />
              </FormControl>
            </FormField>
          </Box>
          <Box flexGrow="1" minWidth="160px">
            <FormField name="billingPostcode" className={formStyles.field}>
              <FormLabel className={formStyles.label} asChild>
                <Text>
                  <Text color="red">*</Text> Postcode
                </Text>
              </FormLabel>
              <FormControl asChild>
                <TextField.Root
                  placeholder="Postcode"
                  {...register("billingPostcode", {
                    required: "Billing postcode is required",
                  })}
                />
              </FormControl>
              {errors.billingPostcode && (
                <Text size="1" color="red">
                  {errors.billingPostcode.message as string}
                </Text>
              )}
            </FormField>
          </Box>
        </Flex>
      </Flex>
      {/* Delivery address */}
      <Flex direction="column" gap="2" mt="3">
        <Flex align="center" justify="between">
          <Text weight="bold">Delivery address</Text>
          <Flex align="center" gap="2">
            <Controller
              name="deliverySameAsBilling"
              control={control}
              render={({ field }) => (
                <Flex align="center" gap="2">
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={(checked) => field.onChange(!!checked)}
                  />
                  <Text size="1">Same as billing address</Text>
                </Flex>
              )}
            />
          </Flex>
        </Flex>
        {deliverySameAsBilling ? (
          <Text size="2" color="gray">
            Delivery will be sent to the billing address above.
          </Text>
        ) : (
          <>
            <Flex gap="3">
              <Box flexGrow="1" minWidth="260px">
                <FormField
                  name="deliveryAddressLine1"
                  className={formStyles.field}
                >
                  <FormLabel className={formStyles.label} asChild>
                    <Text>
                      <Text color="red">*</Text> Address line 1
                    </Text>
                  </FormLabel>
                  <FormControl asChild>
                    <TextField.Root
                      placeholder="Address line 1"
                      {...register("deliveryAddressLine1", {
                        validate: (value) =>
                          deliverySameAsBilling ||
                          value ||
                          "Delivery address line 1 is required",
                      })}
                    />
                  </FormControl>
                  {errors.deliveryAddressLine1 && (
                    <Text size="1" color="red">
                      {errors.deliveryAddressLine1.message as string}
                    </Text>
                  )}
                </FormField>
              </Box>
              <Box flexGrow="1" minWidth="260px">
                <FormField
                  name="deliveryAddressLine2"
                  className={formStyles.field}
                >
                  <FormLabel className={formStyles.label} asChild>
                    <Text>Address line 2</Text>
                  </FormLabel>
                  <FormControl asChild>
                    <TextField.Root
                      placeholder="Address line 2 (optional)"
                      {...register("deliveryAddressLine2")}
                    />
                  </FormControl>
                </FormField>
              </Box>
            </Flex>
            <Flex gap="3">
              <Box flexGrow="1" minWidth="200px">
                <FormField name="deliveryTown" className={formStyles.field}>
                  <FormLabel className={formStyles.label} asChild>
                    <Text>
                      <Text color="red">*</Text> Town
                    </Text>
                  </FormLabel>
                  <FormControl asChild>
                    <TextField.Root
                      placeholder="Town"
                      {...register("deliveryTown", {
                        validate: (value) =>
                          deliverySameAsBilling ||
                          value ||
                          "Delivery town is required",
                      })}
                    />
                  </FormControl>
                  {errors.deliveryTown && (
                    <Text size="1" color="red">
                      {errors.deliveryTown.message as string}
                    </Text>
                  )}
                </FormField>
              </Box>
              <Box flexGrow="1" minWidth="200px">
                <FormField name="deliveryCounty" className={formStyles.field}>
                  <FormLabel className={formStyles.label} asChild>
                    <Text>County</Text>
                  </FormLabel>
                  <FormControl asChild>
                    <TextField.Root
                      placeholder="County (optional)"
                      {...register("deliveryCounty")}
                    />
                  </FormControl>
                </FormField>
              </Box>
              <Box flexGrow="1" minWidth="160px">
                <FormField name="deliveryPostcode" className={formStyles.field}>
                  <FormLabel className={formStyles.label} asChild>
                    <Text>
                      <Text color="red">*</Text> Postcode
                    </Text>
                  </FormLabel>
                  <FormControl asChild>
                    <TextField.Root
                      placeholder="Postcode"
                      {...register("deliveryPostcode", {
                        validate: (value) =>
                          deliverySameAsBilling ||
                          value ||
                          "Delivery postcode is required",
                      })}
                    />
                  </FormControl>
                  {errors.deliveryPostcode && (
                    <Text size="1" color="red">
                      {errors.deliveryPostcode.message as string}
                    </Text>
                  )}
                </FormField>
              </Box>
            </Flex>
          </>
        )}
      </Flex>
      {/* Occasion date using DayPicker */}
      <Flex gap="3" mt="2">
        {/* Occasion date (required) */}
        <Box>
          <FormField name="occasionDate" className={formStyles.field}>
            <FormLabel className={formStyles.label} asChild>
              <Text>
                <Text color="red">*</Text> Occasion date
              </Text>
            </FormLabel>
            <FormControl asChild>
              <Controller
                name="occasionDate"
                control={control}
                rules={{ required: "Occasion date is required" }}
                render={({ field }) => (
                  <Popover.Root>
                    <Popover.Trigger>
                      <Button
                        type="button"
                        variant="outline"
                        size="2"
                        style={{ width: "100%" }}
                      >
                        {field.value ? formatDate(field.value) : "Pick date"}
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
                          field.onChange(iso);
                        }}
                      />
                    </Popover.Content>
                    {/* Hidden input so RHF still has a real field */}
                    <input type="hidden" {...field} />
                  </Popover.Root>
                )}
              />
            </FormControl>
            {errors.occasionDate && (
              <Text size="1" color="red">
                {errors.occasionDate.message as string}
              </Text>
            )}
          </FormField>
        </Box>
      </Flex>
    </Flex>
  );
};

export default CustomerData;
