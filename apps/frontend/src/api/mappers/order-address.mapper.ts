import type { CreateOrderFormValues } from "@/pages/home/components/create-new-customer-form/create-new-customer-form";

export const mapOrderAddressesToPayload = (values: CreateOrderFormValues) => ({
  billingAddressLine1: values.billingAddressLine1,
  billingAddressLine2: values.billingAddressLine2 ?? "",
  billingTown: values.billingTown,
  billingCounty: values.billingCounty ?? "",
  billingPostcode: values.billingPostcode,
  deliverySameAsBilling: values.deliverySameAsBilling,
  deliveryAddressLine1: values.deliverySameAsBilling
    ? values.billingAddressLine1
    : (values.deliveryAddressLine1 ?? ""),
  deliveryAddressLine2: values.deliverySameAsBilling
    ? (values.billingAddressLine2 ?? "")
    : (values.deliveryAddressLine2 ?? ""),
  deliveryTown: values.deliverySameAsBilling
    ? values.billingTown
    : (values.deliveryTown ?? ""),
  deliveryCounty: values.deliverySameAsBilling
    ? (values.billingCounty ?? "")
    : (values.deliveryCounty ?? ""),
  deliveryPostcode: values.deliverySameAsBilling
    ? values.billingPostcode
    : (values.deliveryPostcode ?? ""),
});
