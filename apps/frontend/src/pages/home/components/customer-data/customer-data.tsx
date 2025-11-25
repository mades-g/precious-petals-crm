import type { FC } from "react"
import { FormControl, FormField, FormLabel } from "@radix-ui/react-form"
import { Box, TextField, Text, Flex, Select } from "@radix-ui/themes"
import { useFormContext, Controller } from "react-hook-form"

import {
  CUSTOMERS_HOW_RECOMMENDED_OPTIONS,
  CUSTOMERS_TITLE_OPTIONS,
} from "@/services/pb/constants"

import type { CreateOrderFormValues } from "../create-new-customer-form/create-new-customer-form"
import formStyles from "../create-new-customer-form/create-new-customer-form.module.css"

type CustomerDataProps = {
  nextOrderNo: string
}

const CustomerData: FC<CustomerDataProps> = ({ nextOrderNo }) => {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<CreateOrderFormValues>()

  return (
    <Flex gap="3" direction="column">
      {!nextOrderNo && (
        <Flex>
          <Box maxWidth="100px">
            <FormField name="orderNo" className={formStyles.field}>
              <FormLabel className={formStyles.label} asChild>
                <Text>Order No</Text>
              </FormLabel>
              <FormControl asChild>
                <TextField.Root
                  type="number"
                  {...register("orderNo")}
                  disabled={!!nextOrderNo}
                />
              </FormControl>
              {errors.orderNo && (
                <Text size="1" color="red">
                  {errors.orderNo.message}
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
                {errors.title.message}
              </Text>
            )}
          </FormField>
        </Box>
        <Box flexGrow="1" minWidth="200px">
          <FormField name="firstName" className={formStyles.field}>
            <FormLabel className={formStyles.label} asChild>
              <Text>First name</Text>
            </FormLabel>
            <FormControl asChild>
              <TextField.Root
                placeholder="First name"
                {...register("firstName")}
              />
            </FormControl>
            {errors.firstName && (
              <Text size="1" color="red">
                {errors.firstName.message}
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
                {errors.surname.message}
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
                {errors.email.message}
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
                    message: "Please enter a vaid UK number"
                  }
                })}
              />
            </FormControl>
            {errors.telephone && (
              <Text size="1" color="red">
                {errors.telephone.message}
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
                {errors.howRecommended.message}
              </Text>
            )}
          </FormField>
        </Box>
      </Flex>
      <Flex gap="3">
        <Box flexGrow="1" minWidth="260px">
          <FormField name="deliveryAddress" className={formStyles.field}>
            <FormLabel className={formStyles.label} asChild>
              <Text>
                <Text color="red">*</Text> Delivery address
              </Text>
            </FormLabel>
            <FormControl asChild>
              <TextField.Root
                placeholder="Start typing postcode or address"
                {...register("deliveryAddress", {
                  required: "Delivery address is required",
                })}
              />
            </FormControl>
            {errors.deliveryAddress && (
              <Text size="1" color="red">
                {errors.deliveryAddress.message}
              </Text>
            )}
          </FormField>
        </Box>
        <Box>
          <FormField name="occasionDate" className={formStyles.field}>
            <FormLabel className={formStyles.label} asChild>
              <Text>
                <Text color="red">*</Text> Occasion date
              </Text>
            </FormLabel>
            <FormControl asChild>
              <TextField.Root
                type="date"
                {...register("occasionDate", {
                  required: "Occasion date is required",
                })}
              />
            </FormControl>
            {errors.occasionDate && (
              <Text size="1" color="red">
                {errors.occasionDate.message}
              </Text>
            )}
          </FormField>
        </Box>
        <Box>
          <FormField name="preservationDate" className={formStyles.field}>
            <FormLabel className={formStyles.label} asChild>
              <Text>Preservation date</Text>
            </FormLabel>
            <FormControl asChild>
              <TextField.Root
                type="date"
                {...register("preservationDate")}
              />
            </FormControl>
            {errors.preservationDate && (
              <Text size="1" color="red">
                {errors.preservationDate.message}
              </Text>
            )}
          </FormField>
        </Box>
      </Flex>
    </Flex>
  )
}

export default CustomerData
