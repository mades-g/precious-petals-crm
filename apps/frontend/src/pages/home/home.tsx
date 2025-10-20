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
              <Box style={{ flex: 1}}>
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
                  <Table.ColumnHeaderCell>Order No</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Phone</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Occasion date</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Payment status</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Preservation type</Table.ColumnHeaderCell>
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
