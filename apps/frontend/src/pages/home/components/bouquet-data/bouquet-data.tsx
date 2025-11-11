import { FormControl, FormField, FormLabel } from "@radix-ui/react-form";
import {
  Box,
  Flex,
  Select,
  Separator,
  Text,
  TextField,
} from "@radix-ui/themes";

import {
  FRAME_LAYOUT_OPTIONS,
  FRAME_MOUNT_COLOUR_OPTIONS,
  FRAME_PRESERVATION_TYPE_OPTIONS,
  FRAME_TYPE_OPTIONS,
} from "@/services/pb/constants";

import formStyles from "../create-new-customer-form/create-new-customer-form.module.css";

const BouquetData = () => {
  return (
    <Flex direction="column" gap="3">
      <Flex direction="row" gap="3" wrap="wrap" justify="between">
        <Box>
          <FormField name="measuredSize" className={formStyles.filed}>
            <FormLabel className={formStyles.label} asChild>
              <Text>
                <Text color="red">*</Text> Measured size (in)
              </Text>
            </FormLabel>
            <Flex gap="3" align="center">
              <Text size="1">X</Text>
              <FormControl asChild>
                <FormField name="measuredWidthIn">
                  <TextField.Root
                    name="measuredWidthIn"
                    type="number"
                    min="0"
                  />
                </FormField>
              </FormControl>
              <Text size="1">Y</Text>
              <FormControl asChild>
                <FormField name="measuredHeightIn">
                  <TextField.Root
                    name="measuredHeightIn"
                    type="number"
                    min="0"
                  />
                </FormField>
              </FormControl>
            </Flex>
          </FormField>
        </Box>
        <Box minWidth="250px">
          <FormField name="layout" className={formStyles.field}>
            <FormLabel className={formStyles.label} asChild>
              <Text>
                <Text color="red">*</Text> Layout
              </Text>
            </FormLabel>
            <FormControl asChild>
              <Select.Root name="layout">
                <Select.Trigger placeholder="Layout" />
                <Select.Content>
                  {FRAME_LAYOUT_OPTIONS.map((opt) => (
                    <Select.Item key={opt} value={opt}>
                      {opt}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </FormControl>
          </FormField>
        </Box>
        <Box>
          <FormField name="recommendedSize" className={formStyles.filed}>
            <FormLabel className={formStyles.label} asChild>
              <Text>
                <Text color="red">*</Text> Recommended frame size (in)
              </Text>
            </FormLabel>
            <Flex gap="3" align="center">
              <Text size="1">X</Text>
              <FormControl asChild>
                <FormField name="recommendedSizeWidthIn">
                  <TextField.Root
                    name="recommendedSizeWidthIn"
                    type="number"
                    min="0"
                  />
                </FormField>
              </FormControl>
              <Text size="1">Y</Text>
              <FormControl asChild>
                <FormField name="recommendedSizeHeightIn">
                  <TextField.Root
                    name="recommendedSizeHeightIn"
                    type="number"
                    min="0"
                  />
                </FormField>
              </FormControl>
            </Flex>
          </FormField>
        </Box>
        <Box minWidth="250px">
          <FormField name="preservationType" className={formStyles.field}>
            <FormLabel className={formStyles.label} asChild>
              <Text>
                <Text color="red">*</Text> Preservation type
              </Text>
            </FormLabel>
            <FormControl asChild>
              <Select.Root name="preservationType">
                <Select.Trigger placeholder="Preservation type" />
                <Select.Content>
                  {FRAME_PRESERVATION_TYPE_OPTIONS.map((opt) => (
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
      <Separator orientation="horizontal" size="4" />
      <Flex gap="3" justify="between" direction="row">
        <Box minWidth="250px">
          <FormField name="frameType" className={formStyles.field}>
            <FormLabel className={formStyles.label} asChild>
              <Text>
                <Text color="red">*</Text> Recommended Frame type
              </Text>
            </FormLabel>
            <FormControl asChild>
              <Select.Root name="frameType">
                <Select.Trigger placeholder="Frame type" />
                <Select.Content>
                  {FRAME_TYPE_OPTIONS.map((opt) => (
                    <Select.Item key={opt} value={opt}>
                      {opt}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </FormControl>
          </FormField>
        </Box>
        <Box>
          <FormField name="framePrice">
            <FormLabel className={formStyles.label} asChild>
              <Text>
                <Text color="red">*</Text> Price (£)
              </Text>
            </FormLabel>
            <FormControl asChild>
              <TextField.Root
                name="framePrice"
                type="number"
                min="0"
                step="0.01"
              />
            </FormControl>
          </FormField>
        </Box>
      </Flex>
      <Separator orientation="horizontal" size="4" />
      <Flex gap="3" justify="between" direction="row">
        <Box minWidth="250px">
          <FormField name="mountColour" className={formStyles.field}>
            <FormLabel className={formStyles.label} asChild>
              <Text>
                <Text color="red">*</Text> Recommended Mount colour
              </Text>
            </FormLabel>
            <FormControl asChild>
              <Select.Root name="mountColour">
                <Select.Trigger placeholder="Mount colour" />
                <Select.Content>
                  {FRAME_MOUNT_COLOUR_OPTIONS.map((opt) => (
                    <Select.Item key={opt} value={opt}>
                      {opt}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </FormControl>
          </FormField>
        </Box>
        <Box>
          <FormField name="framePrice">
            <FormLabel className={formStyles.label} asChild>
              <Text>
                <Text color="red">*</Text> Price (£)
              </Text>
            </FormLabel>
            <FormControl asChild>
              <TextField.Root
                name="framePrice"
                type="number"
                min="0"
                step="0.01"
              />
            </FormControl>
          </FormField>
        </Box>
      </Flex>
    </Flex>
  );
};

export default BouquetData;
