import type { FC } from "react";
import { Table } from "@radix-ui/themes";

import type { NormalisedCustomer } from "@/features/customers/api/get-customers";

import CustomerRow from "../customer-row/customer-row";

type CustomerTableProps = {
  customers: NormalisedCustomer[] | undefined;
};

const CustomerTable: FC<CustomerTableProps> = ({ customers }) => {
  return (
    <Table.Root variant="surface">
      <Table.Header>
        <Table.Row>
          {/* order number - column needs to be smaller */}
          {/* order id map */}
          <Table.ColumnHeaderCell>Order</Table.ColumnHeaderCell>
          {/* Should include - title First and last name, email, phonenumer how recommed */}
          <Table.ColumnHeaderCell>Customer</Table.ColumnHeaderCell>
          {/* postcode and delivery address */}
          <Table.ColumnHeaderCell>Delivery address</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Occasion date</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Payment status</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Frame Details</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Paper weight</Table.ColumnHeaderCell>
          {/* list of actions */}
          <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {customers?.map((customer) => (
          <CustomerRow customer={customer} key={customer.colId} />
        ))}
      </Table.Body>
    </Table.Root>
  );
};

export default CustomerTable;
