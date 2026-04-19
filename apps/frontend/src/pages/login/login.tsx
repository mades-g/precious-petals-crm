import { useState } from "react";
import { EyeClosedIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  IconButton,
  Text,
  TextField,
} from "@radix-ui/themes";
import { useMutation } from "@tanstack/react-query";

import { login } from "@/services/pb/client";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    mutationKey: ["login"],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await mutateAsync({ email: normalizeEmail(email), password });
  };

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
              onBlur={() => setEmail((current) => normalizeEmail(current))}
              disabled={isPending}
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
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
              data-testid="password"
            >
              <TextField.Slot pr="3">
                <IconButton
                  size="2"
                  variant="ghost"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  data-testid="toggle-password-visibility"
                >
                  {showPassword ? (
                    <EyeClosedIcon height="16" width="16" />
                  ) : (
                    <EyeOpenIcon height="16" width="16" />
                  )}
                </IconButton>
              </TextField.Slot>
            </TextField.Root>
          </Box>
          <Flex justify="end" gap="3" mt="3">
            <Button
              type="submit"
              loading={isPending}
              disabled={isPending}
              data-testid="sign-in-btn"
            >
              {isPending ? "Signing in..." : "Sign in"}
            </Button>
          </Flex>
        </Flex>
      </form>
    </Card>
  );
};

export default Login;
