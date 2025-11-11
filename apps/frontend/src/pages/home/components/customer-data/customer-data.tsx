import type { FC } from "react";
import { FormControl, FormField, FormLabel } from "@radix-ui/react-form";
import { Box, TextField, Text, Flex, Select } from "@radix-ui/themes";

import {
  CUSTOMERS_HOW_RECOMMENDED_OPTIONS,
  CUSTOMERS_TITLE_OPTIONS,
} from "@/services/pb/constants";

import formStyles from "../create-new-customer-form/create-new-customer-form.module.css";

type CustomerDataProps = {
  nextOrderNo: string;
};

const CustomerData: FC<CustomerDataProps> = ({ nextOrderNo }) => {
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
                  name="orderNo"
                  type="number"
                  defaultValue={nextOrderNo}
                  disabled={!!nextOrderNo}
                />
              </FormControl>
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
              <Select.Root name="title">
                <Select.Trigger placeholder="Title" />
                <Select.Content>
                  {CUSTOMERS_TITLE_OPTIONS.map((opt) => (
                    <Select.Item key={opt} value={opt}>
                      {opt}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </FormControl>
          </FormField>
        </Box>
        <Box flexGrow="1" minWidth="200px">
          <FormField name="firstName" className={formStyles.field}>
            <FormLabel className={formStyles.label} asChild>
              <Text>First name</Text>
            </FormLabel>
            <FormControl asChild>
              <TextField.Root name="firstName" placeholder="First name" />
            </FormControl>
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
              <TextField.Root name="surname" placeholder="Surname" />
            </FormControl>
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
              <TextField.Root name="email" type="email" />
            </FormControl>
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
              <TextField.Root name="telephone" />
            </FormControl>
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
              <Select.Root name="howRecommended">
                <Select.Trigger placeholder="Select source" />
                <Select.Content>
                  {CUSTOMERS_HOW_RECOMMENDED_OPTIONS.map((opt) => (
                    <Select.Item key={opt} value={opt}>
                      {opt}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </FormControl>
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
                name="deliveryAddress"
                placeholder="Start typing postcode or address"
              />
            </FormControl>
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
              <TextField.Root name="occasionDate" type="date" />
            </FormControl>
          </FormField>
        </Box>
        <Box>
          <FormField name="preservationDate" className={formStyles.field}>
            <FormLabel className={formStyles.label} asChild>
              <Text>Preservation date</Text>
            </FormLabel>
            <FormControl asChild>
              <TextField.Root name="preservationDate" type="date" />
            </FormControl>
          </FormField>
        </Box>
      </Flex>
    </Flex>
  );
};

export default CustomerData;
