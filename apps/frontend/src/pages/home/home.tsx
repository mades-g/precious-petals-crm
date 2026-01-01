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
  Popover,
} from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { DayPicker } from "react-day-picker";

import { getCustomers, type GetCustomersParams } from "@/api/get-customers";
import { formatDate } from "@/utils";

import CustomerTable from "./components/customer-table/costumer-table";

import "react-day-picker/dist/style.css";

const DEBOUNCE_MS = 500;

const Home = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  // Raw values bound to inputs
  const [filters, setFilters] = useState({
    email: "",
    surname: "",
    telephone: "",
    occasionDate: "",
    orderNo: "", // ✅ NEW
  });

  const { email, surname, telephone, occasionDate, orderNo } = filters;

  // Debounced text filters
  const [debouncedTextFilters, setDebouncedTextFilters] = useState({
    email: "",
    surname: "",
    telephone: "",
    orderNo: "", // ✅ NEW
  });

  // Occasion date that is *actually* applied to the search
  const [appliedOccasionDate, setAppliedOccasionDate] = useState("");

  // Final params used by the query
  const searchParams: GetCustomersParams = {
    email: debouncedTextFilters.email,
    surname: debouncedTextFilters.surname,
    telephone: debouncedTextFilters.telephone,
    orderNo: debouncedTextFilters.orderNo, // ✅ NEW
    occasionDate: appliedOccasionDate,
  };

  // 🔁 Debounce text filters
  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedTextFilters({ email, surname, telephone, orderNo });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(id);
  }, [email, surname, telephone, orderNo]);

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
                  <Text weight="medium">Search by order #</Text>
                  <TextField.Root
                    type="search"
                    name="search-order"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    value={filters.orderNo}
                    onChange={handleChange("orderNo")}
                  >
                    <TextField.Slot>
                      <MagnifyingGlassIcon height="16" width="16" />
                    </TextField.Slot>
                    {filters.orderNo && (
                      <TextField.Slot pr="3">
                        <IconButton
                          size="2"
                          variant="ghost"
                          type="button"
                          onClick={() => handleClear("orderNo")}
                        >
                          <Cross2Icon height="16" width="16" />
                        </IconButton>
                      </TextField.Slot>
                    )}
                  </TextField.Root>
                </Box>
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
                    name="search-telephone"
                    type="number"
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

                {/* 🔎 Occasion date filter */}
                <Box>
                  <Text weight="medium">Search by occasion date</Text>

                  <Flex gap="2" align="center">
                    <Flex direction="column">
                      <Popover.Root>
                        <Popover.Trigger>
                          <Button variant="outline" type="button" size="2">
                            {occasionDate
                              ? formatDate(occasionDate)
                              : "Pick a date"}
                          </Button>
                        </Popover.Trigger>

                        <Popover.Content>
                          <DayPicker
                            mode="single"
                            selected={
                              occasionDate ? new Date(occasionDate) : undefined
                            }
                            onSelect={(date) => {
                              const iso = date
                                ? date.toISOString().slice(0, 10)
                                : "";
                              setFilters((prev) => ({
                                ...prev,
                                occasionDate: iso,
                              }));
                              setAppliedOccasionDate(iso);
                            }}
                          />
                        </Popover.Content>
                      </Popover.Root>
                    </Flex>

                    {occasionDate && (
                      <IconButton
                        size="2"
                        variant="ghost"
                        type="button"
                        onClick={() => {
                          setFilters((prev) => ({ ...prev, occasionDate: "" }));
                          setAppliedOccasionDate("");
                        }}
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
