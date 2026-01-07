import type { CreateOrderFormValues } from "@/pages/home/components/create-new-customer-form/create-new-customer-form";

export const hasPaperweightDetails = (values: CreateOrderFormValues): boolean =>
  values.paperweightQuantity != null && values.paperweightPrice != null;
