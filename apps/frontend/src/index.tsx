import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

import { router } from "./routes/router";
import "./index.css";

const buildVersion = import.meta.env.VITE_BUILD_VERSION ?? "dev";
const buildCommit = import.meta.env.VITE_BUILD_COMMIT ?? "unknown";
const buildTime = import.meta.env.VITE_BUILD_TIME ?? "unknown";

console.info(
  `precious-petals-crm frontend build version=${buildVersion} commit=${buildCommit} builtAt=${buildTime}`,
);

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
