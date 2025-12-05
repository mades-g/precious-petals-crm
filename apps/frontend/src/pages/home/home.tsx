import { useEffect, useState } from "react";
import { Cross2Icon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  TextField,
  Text,
  IconButton,
} from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";

import { getCustomers, type GetCustomersParams } from "@/api/get-customers";

import CustomerTable from "./components/customer-table/costumer-table";
import { formatDate } from "@/utils";

const DEBOUNCE_MS = 300;

const Home = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  // Raw values bound to inputs
  const [filters, setFilters] = useState({
    email: "",
    surname: "",
    telephone: "",
    occasionDate: "",
  });

  const { email, surname, telephone, occasionDate } = filters;

  // Debounced text filters
  const [debouncedTextFilters, setDebouncedTextFilters] = useState({
    email: "",
    surname: "",
    telephone: "",
  });

  // Occasion date that is *actually* applied to the search
  const [appliedOccasionDate, setAppliedOccasionDate] = useState("");

  // Final params used by the query
  const searchParams = {
    email: debouncedTextFilters.email,
    surname: debouncedTextFilters.surname,
    telephone: debouncedTextFilters.telephone,
    occasionDate: appliedOccasionDate,
  };

  // 🔁 Debounce text filters
  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedTextFilters({ email, surname, telephone });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(id);
  }, [email, surname, telephone]);

  // React Query fetch using the *applied* params
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["customers", searchParams],
    queryFn: ({ queryKey }) => {
      const [, params] = queryKey as [string, GetCustomersParams];
      return getCustomers(params);
    },
  });

  const customers = data ?? [];
  const hasData = customers.length > 0;

  const nextOrderNo =
    hasData && customers[0].orderDetails
      ? customers[0].orderDetails.orderNo
      : undefined;

  const handleChange =
    (field: keyof typeof filters) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFilters((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleClear = (field: keyof typeof filters) => {
    setFilters((prev) => ({
      ...prev,
      [field]: "",
    }));

    if (field === "occasionDate") {
      // also clear the applied filter so query updates once
      setAppliedOccasionDate("");
    }
  };

  const handleApplyDate = () => {
    // user explicitly applies the current date
    setAppliedOccasionDate(occasionDate);
  };

  return (
    <Flex mx="auto" pt="9">
      <Box minWidth="80vw">
        <Card>
          <Flex gap="2" direction="column">
            <Flex gap="9">
              <Heading>Customers</Heading>
              <Flex
                width="100%"
                justify="between"
                align="end"
                gap="4"
                wrap="wrap"
              >
                <Box>
                  <Text weight="medium">Search by email</Text>
                  <TextField.Root
                    type="search"
                    name="search-email"
                    value={filters.email}
                    onChange={handleChange("email")}
                  >
                    <TextField.Slot>
                      <MagnifyingGlassIcon height="16" width="16" />
                    </TextField.Slot>
                    {filters.email && (
                      <TextField.Slot pr="3">
                        <IconButton
                          size="2"
                          variant="ghost"
                          type="button"
                          onClick={() => handleClear("email")}
                        >
                          <Cross2Icon height="16" width="16" />
                        </IconButton>
                      </TextField.Slot>
                    )}
                  </TextField.Root>
                </Box>
                <Box>
                  <Text weight="medium">Search by surname</Text>
                  <TextField.Root
                    type="search"
                    name="search-surname"
                    value={filters.surname}
                    onChange={handleChange("surname")}
                  >
                    <TextField.Slot>
                      <MagnifyingGlassIcon height="16" width="16" />
                    </TextField.Slot>
                    {filters.surname && (
                      <TextField.Slot pr="3">
                        <IconButton
                          size="2"
                          variant="ghost"
                          type="button"
                          onClick={() => handleClear("surname")}
                        >
                          <Cross2Icon height="16" width="16" />
                        </IconButton>
                      </TextField.Slot>
                    )}
                  </TextField.Root>
                </Box>
                <Box>
                  <Text weight="medium">Search by telephone</Text>
                  <TextField.Root
                    type="search"
                    name="search-telephone"
                    value={filters.telephone}
                    onChange={handleChange("telephone")}
                  >
                    <TextField.Slot>
                      <MagnifyingGlassIcon height="16" width="16" />
                    </TextField.Slot>
                    {filters.telephone && (
                      <TextField.Slot pr="3">
                        <IconButton
                          size="2"
                          variant="ghost"
                          type="button"
                          onClick={() => handleClear("telephone")}
                        >
                          <Cross2Icon height="16" width="16" />
                        </IconButton>
                      </TextField.Slot>
                    )}
                  </TextField.Root>
                </Box>
                <Box>
                  <Text weight="medium">Search by occasion date</Text>
                  <Flex gap="2" align="center">
                    <Flex direction="column">
                      <TextField.Root
                        type="date"
                        name="search-occasion-date"
                        value={filters.occasionDate}
                        onChange={handleChange("occasionDate")}
                      />
                      {filters.occasionDate && (
                        <Text size="1" color="gray">
                          {formatDate(filters.occasionDate)}{" "}
                          {/* en-GB formatted */}
                        </Text>
                      )}
                    </Flex>

                    <Button
                      type="button"
                      variant="soft"
                      onClick={handleApplyDate}
                      disabled={!filters.occasionDate}
                    >
                      Apply date
                    </Button>

                    {filters.occasionDate && (
                      <IconButton
                        size="2"
                        variant="ghost"
                        type="button"
                        onClick={() => handleClear("occasionDate")}
                      >
                        <Cross2Icon height="16" width="16" />
                      </IconButton>
                    )}
                  </Flex>
                </Box>

                <Button
                  onClick={() => {
                    setIsModalOpen(true);
                    setModalMode("create");
                  }}
                >
                  Create new order
                </Button>
              </Flex>
            </Flex>
            {isLoading && (
              <Text size="2" color="gray">
                Loading customers…
              </Text>
            )}
            {isError && (
              <Text size="2" color="red">
                {(error as Error)?.message ?? "Failed to load customers."}
              </Text>
            )}
            {!isLoading && !isError && (
              <CustomerTable
                customers={customers}
                nextOrderNo={nextOrderNo}
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                setModalMode={setModalMode}
                modalMode={modalMode}
              />
            )}
          </Flex>
        </Card>
      </Box>
    </Flex>
  );
};

export default Home;
