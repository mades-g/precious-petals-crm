import type { ReactNode } from "react"
import { Theme, Flex } from "@radix-ui/themes"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Theme>
      <Flex
        height="100vh"
        width="100vw"
      >
        {children}
      </Flex>
    </Theme>
  )
}
