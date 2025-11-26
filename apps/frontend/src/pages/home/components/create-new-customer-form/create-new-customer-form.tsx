import * as Form from "@radix-ui/react-form";

import { type FC, type ReactNode } from "react";
import { useForm, FormProvider, type SubmitHandler } from "react-hook-form";

export type BouquetItemFormValues = {
  measuredWidthIn: number | null;
  measuredHeightIn: number | null;
  layout: string;
  recommendedSizeWidthIn: number | null;
  recommendedSizeHeightIn: number | null;
  preservationType: string;
  frameType: string;
  framePrice: number | null;
  mountColour: string;
  mountPrice: number | null;
};

export type CreateOrderFormValues = {
  orderNo: string;
  title: string;
  firstName: string;
  surname: string;
  email: string;
  telephone: string;
  howRecommended: string;
  deliveryAddress: string;
  occasionDate: string;
  preservationDate: string;
  bouquets: BouquetItemFormValues[];
  //
  hasPaperweight: boolean;
  paperweightQuantity: number | null;
  paperweightPrice: number | null;
  //
  deliverySameAsBilling: boolean;
  deliveryAddressLine1?: string;
  deliveryAddressLine2?: string;
  deliveryTown?: string;
  deliveryCounty?: string;
  deliveryPostcode?: string;
  //
  billingAddressLine1: string;
  billingAddressLine2?: string;
  billingTown: string;
  billingCounty?: string;
  billingPostcode: string;
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
