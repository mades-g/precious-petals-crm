import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { getCustomers } from "@/api/get-customers";
import { useAuth } from "@/auth/hooks/use-auth";

import Home from "./home";

vi.mock("@/api/get-customers", () => ({
  getCustomers: vi.fn(),
}));

vi.mock("@/auth/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

const renderHome = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Home />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.mocked(getCustomers).mockReset();
  vi.mocked(getCustomers).mockImplementation(
    () => new Promise<Awaited<ReturnType<typeof getCustomers>>>(() => {}),
  );
  vi.mocked(useAuth).mockReturnValue({
    isAuthed: true,
    isAdmin: true,
    user: null,
    loading: false,
    logout: vi.fn(),
  });
});

test("renders the customer search controls while loading customers", () => {
  renderHome();

  expect(
    screen.getByRole("heading", { name: "Customers" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Search by order #")).toBeInTheDocument();
  expect(screen.getByText("Search by email")).toBeInTheDocument();
  expect(screen.getByText("Search by surname")).toBeInTheDocument();
  expect(screen.getByText("Search by telephone")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Create new order" }),
  ).toBeEnabled();
  expect(screen.getByText(/Loading customers/)).toBeInTheDocument();
});
