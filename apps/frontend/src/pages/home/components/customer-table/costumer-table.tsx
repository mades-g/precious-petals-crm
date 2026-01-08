import { useState, type FC } from "react";
import { Table } from "@radix-ui/themes";

import type { NormalisedCustomer } from "@/api/get-customers";

import CustomerRow from "../customer-row/customer-row";
import CreateNewOrderModal, {
  type FormStage,
} from "../create-new-order-modal/create-new-order-modal";
import type { CreateOrderFormValues } from "../create-new-customer-form/create-new-customer-form";
import { buildCustomerFormDefaults } from "../create-new-order-modal/create-new-order-modal.utils";
import type { ModalMode } from "../../home";

type CustomerTableProps = {
  customers: NormalisedCustomer[] | undefined;
  nextOrderNo?: number;
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setModalMode: React.Dispatch<React.SetStateAction<ModalMode>>;
  modalMode: ModalMode;
};

const CustomerTable: FC<CustomerTableProps> = ({
  customers,
  nextOrderNo,
  isModalOpen,
  setIsModalOpen,
  setModalMode,
  modalMode,
}) => {
  const [currentFormStage, setCurrentFormStage] =
    useState<FormStage>("costumer_data");

  const [currentCustomerForm, setCurrentCustomerForm] =
    useState<Partial<CreateOrderFormValues> | null>(null);
  return (
    <>
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Order</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Customer</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Delivery address</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Occasion date</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Payment status</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Frame Details</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Paper weight</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {customers?.map((customer) => (
            <CustomerRow
              customer={customer}
              key={customer.customerId}
              onClick={(formStage) => {
                setIsModalOpen(true);
                setModalMode("edit");
                setCurrentFormStage(formStage);
                setCurrentCustomerForm(buildCustomerFormDefaults(customer));
              }}
            />
          ))}
        </Table.Body>
      </Table.Root>
      <CreateNewOrderModal
        modalMode={modalMode}
        isModalOpen={isModalOpen}
        nextOrderNo={nextOrderNo}
        onCancel={() => {
          setIsModalOpen(false);
          setModalMode("create");
        }}
        setCurrentFormStage={setCurrentFormStage}
        currentFormStage={currentFormStage}
        currentCustomerForm={currentCustomerForm}
        selectedBouquetId={null}
      />
    </>
  );
};

export default CustomerTable;
