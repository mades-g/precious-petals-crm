import { FormControl, FormField, FormLabel } from "@radix-ui/react-form";
import { Box, Flex, Text, TextField } from "@radix-ui/themes";

import formStyles from "../create-new-customer-form/create-new-customer-form.module.css";

const PaperWeightData = () => {
  return (
    <Flex gap="3" justify="between" direction="row">
      <Box>
        <FormField name="quantity" className={formStyles.field}>
          <FormLabel className={formStyles.label} asChild>
            <Text>
              <Text color="red">*</Text> Quantity
            </Text>
          </FormLabel>
          <FormControl asChild>
            <TextField.Root
              name="quantity"
              type="number"
              min="0"
              step="0.01"
              required
            />
          </FormControl>
        </FormField>
      </Box>
      <Box>
        <FormField name="price">
          <FormLabel className={formStyles.label} asChild>
            <Text>
              <Text color="red">*</Text> Price (£)
            </Text>
          </FormLabel>
          <FormControl asChild>
            <TextField.Root
              name="price"
              type="number"
              min="0"
              step="0.01"
              className={formStyles.input}
              required
            />
          </FormControl>
        </FormField>
      </Box>
    </Flex>
  );
};

export default PaperWeightData;
