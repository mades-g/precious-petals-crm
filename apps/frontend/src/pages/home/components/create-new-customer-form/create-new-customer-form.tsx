import * as Form from "@radix-ui/react-form";
import { type FC, type ReactNode } from "react";
import { useForm, FormProvider, type SubmitHandler } from "react-hook-form";

import type {
  OrderFrameItemsFrameMountColourOptions,
  OrderFrameItemsFrameTypeOptions,
  OrderFrameItemsGlassTypeOptions,
  OrderFrameItemsInclusionsOptions,
  OrderFrameItemsLayoutOptions,
  OrderFrameItemsPreservationTypeOptions,
} from "@/services/pb/types";

export type BouquetItemFormValues = {
  // ID of the related ORDER_FRAME_ITEMS record (for edit mode)
  id?: string
  measuredWidthIn: number | null
  measuredHeightIn: number | null
  layout: OrderFrameItemsLayoutOptions | ""
  recommendedSizeWidthIn: number | null
  recommendedSizeHeightIn: number | null
  preservationType: OrderFrameItemsPreservationTypeOptions | ""
  preservationDate: string
  frameType: OrderFrameItemsFrameTypeOptions | ""
  framePrice: number | null
  mountColour: OrderFrameItemsFrameMountColourOptions | ""
  mountPrice: number | null
  glassEngraving: string
  glassEngravingPrice: number | null
  glassType: OrderFrameItemsGlassTypeOptions | ""
  glassPrice: number | null
  inclusions: OrderFrameItemsInclusionsOptions | ""
  artworkComplete: boolean
  framingComplete: boolean
}

// TODO: Create a type for each respective collection ID
export type CreateOrderFormValues = {
  customerId?: string
  orderId?: string
  paperweightId?: string | null
  // Above for collections IDS
  orderNo: number
  title: string
  firstName: string
  surname: string
  email: string
  telephone: string
  howRecommended: string
  deliveryAddress: string
  occasionDate: string
  bouquets: BouquetItemFormValues[]
  hasPaperweight: boolean
  paperweightQuantity: number | null
  paperweightPrice: number | null
  paperweightReceived: boolean
  deliverySameAsBilling: boolean
  deliveryAddressLine1?: string
  deliveryAddressLine2?: string
  deliveryTown?: string
  deliveryCounty?: string
  deliveryPostcode?: string
  billingAddressLine1: string
  billingAddressLine2?: string
  billingTown: string
  billingCounty?: string
  billingPostcode: string
};

type CreateNewCustomerFormProps = {
  children: ReactNode;
  formId: string;
  onValidSubmit: SubmitHandler<CreateOrderFormValues>;
  defaultValues?: Partial<CreateOrderFormValues>;
};

const CreateNewCustomerForm: FC<CreateNewCustomerFormProps> = ({
  children,
  formId,
  onValidSubmit,
  defaultValues,
}) => {
  const methods = useForm<CreateOrderFormValues>({
    mode: "onBlur",
    defaultValues: {
      bouquets: [],
      hasPaperweight: false,
      paperweightQuantity: null,
      paperweightPrice: null,
      deliverySameAsBilling: true,
      paperweightReceived: false,
      ...defaultValues,
    } as CreateOrderFormValues,
  });

  const { handleSubmit } = methods;

  return (
    <Form.Root asChild>
      <form id={formId} onSubmit={handleSubmit(onValidSubmit)}>
        <FormProvider {...methods}>{children}</FormProvider>
      </form>
    </Form.Root>
  );
};

export default CreateNewCustomerForm;
