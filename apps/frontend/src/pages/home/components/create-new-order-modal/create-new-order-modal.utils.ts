import { formatSnakeCase } from "@/utils";

import type { CreateOrderFormValues } from "../create-new-customer-form/create-new-customer-form";

import type { ModalMode } from "../../home";

import type { FormStage } from "./create-new-order-modal";

export const getModalTitle = (
  mode: ModalMode,
  formStage: FormStage,
  currentCustomerForm: Partial<CreateOrderFormValues> | null,
) => {
  let titlePart = "Create new";

  if (mode === "edit" && currentCustomerForm) {
    if (
      formStage === "paperweight_data" &&
      currentCustomerForm.hasPaperweight
    ) {
      titlePart = "Edit existing";
    }
    if (formStage === "bouquet_data" && currentCustomerForm.bouquets?.length) {
      titlePart = "Edit existing";
    }
  }

  return `${titlePart} ${formatSnakeCase(formStage).toLowerCase()}`;
};
