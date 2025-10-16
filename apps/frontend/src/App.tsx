import { useEffect, useState } from "react";
import { Flex, Text, Button } from "@radix-ui/themes";

function App() {
  const [status, setStatus] = useState<'unknown'|'ok'|'error'>('unknown')
useEffect(() => {
fetch(`${import.meta.env.VITE_PB_URL || 'http://localhost:8090'}/api/health`).then(r=>{
if (r.ok) setStatus('ok'); else setStatus('error')
}).catch(()=>setStatus('error'))
}, [])

  return (
    <Flex direction="column" gap="2">
			<Text>PocketBase health: <strong>{status}</strong></Text>
			<Button>Let's go</Button>
		</Flex>
  )
}

export default App
