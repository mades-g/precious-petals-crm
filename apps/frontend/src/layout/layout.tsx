import type { ReactNode } from "react"
import { Theme, Box, Flex, Button } from "@radix-ui/themes"
import "@radix-ui/themes/styles.css"

import { useAuth } from "../auth/hooks/use-auth"

export default function Layout({ children }: { children: ReactNode }) {
  const { isAuthed, logout } = useAuth()

  return (
    <Theme accentColor="blue" radius="large">
      <Flex
        align="center"
        justify="center"
        height="100vh"
      >
        {isAuthed && (
          <Button variant="soft" onClick={logout}>
            Logout
          </Button>
        )}
        {children}
      </Flex>
      <Box p="4" style={{ minHeight: "100vh", background: "#fafafa" }}>
        <Flex align="center" justify="between" mb="4">

        </Flex>
        {children}
      </Box>
    </Theme>
  )
}
