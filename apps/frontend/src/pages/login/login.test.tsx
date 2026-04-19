import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Login from "./login";
import { login } from "@/services/pb/client";

vi.mock("@/services/pb/client", () => ({
  login: vi.fn().mockResolvedValue(undefined),
}));

const renderLogin = () => {
  const queryClient = new QueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <Login />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.mocked(login).mockReset();
  vi.mocked(login).mockResolvedValue(undefined);
});

test("renders Sign in text", () => {
  renderLogin();
  expect(screen.getByTestId("sign-in-card")).toBeInTheDocument();
});

test("normalizes the email address on blur", () => {
  renderLogin();

  const emailInput = screen.getByPlaceholderText(
    "Enter your email address",
  ) as HTMLInputElement;

  fireEvent.change(emailInput, {
    target: { value: "  Test.User@Example.COM  " },
  });
  fireEvent.blur(emailInput);

  expect(emailInput.value).toBe("test.user@example.com");
});

test("submits the email address in lowercase", async () => {
  renderLogin();

  fireEvent.change(
    screen.getByPlaceholderText("Enter your email address"),
    { target: { value: " Test.User@Example.COM " } },
  );
  fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
    target: { value: "secret" },
  });
  fireEvent.click(screen.getByTestId("sign-in-btn"));

  await waitFor(() => {
    expect(login).toHaveBeenCalledWith("test.user@example.com", "secret");
  });
});

test("allows the password to be unmasked", () => {
  renderLogin();

  const passwordInput = screen.getByPlaceholderText(
    "Enter your password",
  ) as HTMLInputElement;
  const toggleButton = screen.getByTestId("toggle-password-visibility");

  expect(passwordInput.type).toBe("password");

  fireEvent.click(toggleButton);
  expect(passwordInput.type).toBe("text");

  fireEvent.click(toggleButton);
  expect(passwordInput.type).toBe("password");
});

test("shows a loading state while the login request is pending", async () => {
  let resolveLogin: () => void = () => {};

  vi.mocked(login).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        resolveLogin = resolve;
      }),
  );

  renderLogin();

  fireEvent.change(
    screen.getByPlaceholderText("Enter your email address"),
    { target: { value: "test@example.com" } },
  );
  fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
    target: { value: "secret" },
  });
  fireEvent.click(screen.getByTestId("sign-in-btn"));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Signing in..." })).toBeDisabled();
  });
  expect(screen.getByPlaceholderText("Enter your email address")).toBeDisabled();
  expect(screen.getByPlaceholderText("Enter your password")).toBeDisabled();

  resolveLogin();

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });
});
