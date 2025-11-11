import type { ReactNode, FC } from "react";
import { Form } from "@radix-ui/react-form";

type CreateNewCustomerFormPros = {
  children: ReactNode;
};

const CreateNewCustomerForm: FC<CreateNewCustomerFormPros> = ({ children }) => {
  return <Form>{children}</Form>;
};

export default CreateNewCustomerForm;
