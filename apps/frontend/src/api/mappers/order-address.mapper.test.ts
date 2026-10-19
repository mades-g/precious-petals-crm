import { describe, expect, it } from "vitest";

import type { CreateOrderFormValues } from "@/pages/home/components/create-new-customer-form/create-new-customer-form";
import { mapOrderAddressesToPayload } from "./order-address.mapper";

const formValues: CreateOrderFormValues = {
  orderNo: 201,
  title: "Mrs",
  firstName: "Jane",
  surname: "Smith",
  email: "jane@example.com",
  telephone: "",
  howRecommended: "Google",
  deliveryAddress: "",
  occasionDate: "2026-10-10",
  bouquets: [],
  hasPaperweight: false,
  paperweightQuantity: null,
  paperweightPrice: null,
  paperweightReceived: false,
  billingAddressLine1: "1 Billing Road",
  billingAddressLine2: "Flat 2",
  billingTown: "Basingstoke",
  billingCounty: "Hampshire",
  billingPostcode: "RG21 1AA",
  deliverySameAsBilling: false,
  deliveryAddressLine1: "9 Delivery Street",
  deliveryAddressLine2: "Garden cottage",
  deliveryTown: "Reading",
  deliveryCounty: "Berkshire",
  deliveryPostcode: "RG1 1BB",
};

describe("mapOrderAddressesToPayload", () => {
  it("preserves every separate delivery field when a billing postcode is present", () => {
    expect(mapOrderAddressesToPayload(formValues)).toEqual({
      billingAddressLine1: "1 Billing Road",
      billingAddressLine2: "Flat 2",
      billingTown: "Basingstoke",
      billingCounty: "Hampshire",
      billingPostcode: "RG21 1AA",
      deliverySameAsBilling: false,
      deliveryAddressLine1: "9 Delivery Street",
      deliveryAddressLine2: "Garden cottage",
      deliveryTown: "Reading",
      deliveryCounty: "Berkshire",
      deliveryPostcode: "RG1 1BB",
    });
  });

  it("copies billing fields when delivery is the same, ignoring stale delivery values", () => {
    expect(
      mapOrderAddressesToPayload({ ...formValues, deliverySameAsBilling: true }),
    ).toMatchObject({
      deliverySameAsBilling: true,
      deliveryAddressLine1: "1 Billing Road",
      deliveryAddressLine2: "Flat 2",
      deliveryTown: "Basingstoke",
      deliveryCounty: "Hampshire",
      deliveryPostcode: "RG21 1AA",
    });
  });

  it.each([true, false])(
    "normalizes missing optional address fields when same as billing is %s",
    (deliverySameAsBilling) => {
      expect(
        mapOrderAddressesToPayload({
          ...formValues,
          deliverySameAsBilling,
          billingAddressLine2: undefined,
          billingCounty: undefined,
          deliveryAddressLine2: undefined,
          deliveryCounty: undefined,
        }),
      ).toMatchObject({
        billingAddressLine2: "",
        billingCounty: "",
        deliveryAddressLine2: "",
        deliveryCounty: "",
      });
    },
  );
});
