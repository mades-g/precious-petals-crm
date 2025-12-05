import { useState, type FC } from "react";
import { Table } from "@radix-ui/themes";

import type { NormalisedCustomer } from "@/api/get-customers";

import CustomerRow from "../customer-row/customer-row";
import CreaeNewOrderModal, {
  type FormStage,
} from "../create-new-order-modal/create-new-order-modal";
import type { CreateOrderFormValues } from "../create-new-customer-form/create-new-customer-form";

type CustomerTableProps = {
  customers: NormalisedCustomer[] | undefined;
  nextOrderNo?: number;
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setModalMode: React.Dispatch<React.SetStateAction<"create" | "edit">>;
  modalMode: "create" | "edit";
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
            <CustomerRow
              customer={customer}
              key={customer.customerId}
              onClick={(formStage) => {
                setIsModalOpen(true);
                setModalMode("edit");
                setCurrentFormStage(formStage);
                setCurrentCustomerForm({
                  customerId: customer.customerId,
                  orderId: customer.orderDetails?.orderId,
                  paperweightId:
                    customer.orderDetails?.paperWeightOrder?.paperWeightId,
                  orderNo: customer.orderDetails?.orderNo as number,
                  title: customer.displayName.split(" ")[0],
                  firstName: customer.displayName.split(" ")[1],
                  surname: customer.displayName.split(" ")[2],
                  email: customer.email,
                  telephone: customer.phoneNumber,
                  howRecommended: customer.howRecommended,
                  occasionDate:
                    customer.orderDetails?.occasionDate.split(" ")[0],
                  billingAddressLine1:
                    customer.orderDetails?.billingAddressLine1,
                  billingAddressLine2:
                    customer.orderDetails?.billingAddressLine2,
                  billingCounty: customer.orderDetails?.billingCounty,
                  billingTown: customer.orderDetails?.billingTown,
                  billingPostcode: customer.orderDetails?.billingPostcode,
                  preservationDate: "", // preservation data needs to go to customer
                  deliverySameAsBilling:
                    customer.orderDetails?.deliverySameAsBilling,
                  deliveryAddressLine1:
                    customer.orderDetails?.deliveryAddressLine1,
                  deliveryAddressLine2:
                    customer.orderDetails?.deliveryAddressLine2,
                  deliveryCounty: customer.orderDetails?.deliveryCounty,
                  deliveryPostcode: customer.orderDetails?.deliveryPostcode,
                  deliveryTown: customer.orderDetails?.deliveryTown,
                  // paperweight data
                  paperweightPrice:
                    customer.orderDetails?.paperWeightOrder?.price,
                  paperweightQuantity:
                    customer.orderDetails?.paperWeightOrder?.quantity,
                  paperweightReceived:
                    customer.orderDetails?.paperWeightOrder
                      ?.paperweightReceived,
                  hasPaperweight: !(
                    customer.orderDetails?.paperWeightOrder === null ||
                    customer.orderDetails?.paperWeightOrder === undefined
                  ),
                  // bouquet data
                  bouquets: customer.orderDetails?.frameOrder.map(
                    (frameOrder) => ({
                      id: frameOrder.frameId,
                      // @ts-expect-error need to type `extras`
                      measuredWidthIn: frameOrder.extras?.measuredWidthIn,
                      // @ts-expect-error need to type `extras`
                      measuredHeightIn: frameOrder.extras?.measuredHeightIn,
                      layout: frameOrder.layout,
                      recommendedSizeWidthIn:
                      // @ts-expect-error need to type `extras`
                        frameOrder.extras?.recommendedSizeWidthIn,
                      recommendedSizeHeightIn:
                      // @ts-expect-error need to type `extras`
                        frameOrder.extras?.recommendedSizeHeightIn,
                      preservationType: frameOrder.preservationType,
                      frameType: frameOrder.frameType,
                      // @ts-expect-error need to type `extras`
                      framePrice: frameOrder.extras?.framePrice,
                      // @ts-expect-error need to type `extras`
                      mountPrice: frameOrder.extras?.mountPrice,
                      mountColour: frameOrder.mountColour,
                    }),
                  ),
                });
              }}
            />
          ))}
        </Table.Body>
      </Table.Root>
      <CreaeNewOrderModal
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
      />
    </>
  );
};

export default CustomerTable;
