import type { ReactNode } from "react"
import { Theme, Flex, Button } from "@radix-ui/themes"

import { useAuth } from "../auth/hooks/use-auth"

export default function Layout({ children }: { children: ReactNode }) {
  const { isAuthed, logout } = useAuth()

  return (
    <Theme>
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
    </Theme>
  )
}
