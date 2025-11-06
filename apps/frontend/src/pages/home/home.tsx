import { MagnifyingGlassIcon } from "@radix-ui/react-icons"
import { Box, Button, Card, Flex, Heading, Table, TextField } from "@radix-ui/themes"

const Home = () => {
  return (
    <Flex mx="auto" pt="9">
      <Box minWidth="80vw">
        <Card>
          <Flex gap="2" direction="column">
            <Flex gap="9">
              <Heading>Costumers</Heading>
              <Box style={{ flex: 1 }}>
                <TextField.Root placeholder="Search the docs…" type="search">
                  <TextField.Slot>
                    <MagnifyingGlassIcon height="16" width="16" />
                  </TextField.Slot>
                </TextField.Root>
              </Box>
              <Button>Create new order</Button>
            </Flex>
            <Table.Root variant="surface">
              <Table.Header>
                <Table.Row>
                  {/* order number - column needs to be smaller */}
                  {/* order id map */}
                  <Table.ColumnHeaderCell>Order No</Table.ColumnHeaderCell>
                  {/* Should include - title First and last name, email, phonenumer how recommed */}
                  <Table.ColumnHeaderCell>Costumer</Table.ColumnHeaderCell>
                  {/* postcode and delivery address */}
                  <Table.ColumnHeaderCell>Delivery address</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Occasion date</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Payment status</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Order status</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Preservation type</Table.ColumnHeaderCell>
                  {/* list of actions */}
                  <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
            </Table.Root>
          </Flex>
        </Card>
      </Box>
    </Flex>
  )
}

export default Home
