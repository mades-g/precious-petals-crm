import type { ReactNode } from "react";
import { Theme, Flex, Spinner, Button, Text } from "@radix-ui/themes";
import { useIsFetching } from "@tanstack/react-query";
import { useAuth } from "@/auth/hooks/use-auth";

export default function Layout({ children }: { children: ReactNode }) {
  const isLoading = useIsFetching() > 0;

  const { logout, isAuthed, user } = useAuth();

  return (
    <Theme>
      <Flex direction="column" height="100vh" width="100vw" position="relative">
        {isAuthed && (
          <Flex
            height="60px"
            px="4"
            align="center"
            justify="between"
            style={{
              borderBottom: "1px solid var(--gray-5)",
              backgroundColor: "var(--gray-2)",
            }}
          >
            <Text size="4" weight="bold">
              Precious petals
            </Text>
            <Flex gap="3" justify="center" align="center">
              <Text>Hello, {user?.name} 👋</Text>
              <Button variant="solid" color="red" onClick={logout}>
                Logout
              </Button>
            </Flex>
          </Flex>
        )}
        <Flex flexGrow="1" style={{ overflow: "auto" }} px="4" py="4">
          {children}
        </Flex>
        {isLoading && (
          <Flex
            height="100%"
            width="100%"
            position="absolute"
            top="0"
            left="0"
            align="center"
            justify="center"
            style={{
              background: "rgba(255, 255, 255, 0.4)",
              backdropFilter: "blur(2px)",
            }}
          >
            <Spinner size="3" />
          </Flex>
        )}
      </Flex>
    </Theme>
  );
}
