import { pb } from "@/services/pb/client";
import { COLLECTIONS } from "@/services/pb/constants";
import type {
  CustomersResponse,
  Update,
  CustomersTitleOptions,
  CustomersHowRecommendedOptions,
} from "@/services/pb/types";

export type UpdateCustomerInput = {
  id: string;
  firstName: string;
  surname: string;
  email: string;
  telephone: string;
  title?: CustomersTitleOptions | "";
  howRecommended?: CustomersHowRecommendedOptions | "";
};

export const updateCustomer = async (
  input: UpdateCustomerInput,
): Promise<CustomersResponse> => {
  const { id, title, howRecommended, ...rest } = input;

  const data: Update<"customers"> = {
    ...rest,
    // empty string → undefined, so PB clears or leaves optional
    title: title || undefined,
    howRecommended: howRecommended || undefined,
  };

  return pb
    .collection(COLLECTIONS.CUSTOMERS)
    .update<CustomersResponse>(id, data);
};
