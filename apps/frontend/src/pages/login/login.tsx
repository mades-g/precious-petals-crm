import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Text,
  TextField,
} from "@radix-ui/themes"
import { useState } from "react"

import { pb } from "../../services/pb/pb"

const Login = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    pb.collection("users").authWithPassword(email, password)
  }

  return (
    <Card size="3" style={{ width: 360 }}>
      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="4">
          <Heading size="5" weight="bold">
            Sign in
          </Heading>
          <Box>
            <Text as="label" size="2" htmlFor="email" weight="medium">
              Email
            </Text>
            <TextField.Root
              id="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Box>
          <Box>
            <Flex justify="between" align="center" mb="1">
              <Text as="label" size="2" htmlFor="password" weight="medium">
                Password
              </Text>
            </Flex>
            <TextField.Root
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Box>
          <Flex justify="end" gap="3" mt="3">
            <Button type="submit">Sign in</Button>
          </Flex>
        </Flex>
      </form>
    </Card>
  )
}

export default Login
