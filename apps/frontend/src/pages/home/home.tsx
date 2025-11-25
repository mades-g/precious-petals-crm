import { useState } from "react";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Spinner,
  TextField,
} from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";

import { getCustomers } from "@/features/customers/api/get-customers";

import CustomerTable from "./components/customer-tabel/costumer-tabel";
import CreaeNewOrderModal from "./components/create-new-order-modal/create-new-order-modal";

const Home = () => {
  const { isLoading, data } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isLoading) return <Spinner size="3" />;

  if (!data) return null;

  // given that is sorted by orderId
  const nextOrder = data[0].orderDetails?.orderNo;

  return (
    <Flex mx="auto" pt="9">
      <Box minWidth="80vw">
        <Card>
          <Flex gap="2" direction="column">
            <Flex gap="9">
              <Heading>Customers</Heading>
              <Box flexGrow="1">
                <TextField.Root
                  placeholder="Search"
                  type="search"
                  name="search"
                >
                  <TextField.Slot>
                    <MagnifyingGlassIcon height="16" width="16" />
                  </TextField.Slot>
                </TextField.Root>
              </Box>
              <Button onClick={() => setIsModalOpen(true)}>
                Create new order
              </Button>
            </Flex>
            <CustomerTable customers={data} />
          </Flex>
        </Card>
      </Box>
      <CreaeNewOrderModal
        isModalOpen={isModalOpen}
        nextOrderNo={`${nextOrder || 1}`}
        onCancel={() => setIsModalOpen(false)}
      />
    </Flex>
  );
};

export default Home;
