import { useState } from "react"
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Text,
  TextField,
} from "@radix-ui/themes"
import { useMutation } from "@tanstack/react-query"

import { login } from '@/services/pb/client'

const Login = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const { mutateAsync } = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => login(email, password),
    mutationKey:['login']
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await mutateAsync({ email, password })
  }

  return (
    <Card size="3" m="auto" style={{ width: 360 }} data-testid="sign-in-card">
      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="4">
          <Heading size="5" weight="bold" data-testid="sign-in-heading">
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
              data-testid="email"
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
              data-testid="password"
            />
          </Box>
          <Flex justify="end" gap="3" mt="3">
            <Button type="submit" data-testid="sign-in-btn">Sign in</Button>
          </Flex>
        </Flex>
      </form>
    </Card>
  )
}

export default Login
