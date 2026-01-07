import type { CreateOrderFormValues } from "@/pages/home/components/create-new-customer-form/create-new-customer-form";

export const mapOrderAddressesToPayload = (
  values: CreateOrderFormValues,
) => ({
    billingAddressLine1: values.billingAddressLine1,
    billingAddressLine2: values.billingAddressLine2 ?? "",
    billingTown: values.billingTown,
    billingCounty: values.billingCounty ?? "",
    billingPostcode: values.billingPostcode,
    deliverySameAsBilling: values.deliverySameAsBilling,
    deliveryAddressLine1: values.billingPostcode
      ? values.billingAddressLine1
      : (values.deliveryAddressLine1 ?? ""),
    deliveryAddressLine2: values.billingPostcode
      ? (values.billingAddressLine2 ?? "")
      : (values.deliveryAddressLine2 ?? ""),
    deliveryTown: values.billingPostcode
      ? values.billingTown
      : (values.deliveryTown ?? ""),
    deliveryCounty: values.billingPostcode
      ? (values.billingCounty ?? "")
      : (values.deliveryCounty ?? ""),
    deliveryPostcode: values.billingPostcode
      ? values.billingPostcode
      : (values.deliveryPostcode ?? "")
})
