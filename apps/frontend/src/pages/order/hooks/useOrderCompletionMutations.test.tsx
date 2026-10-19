import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NormalisedCustomer } from "@/api/get-customers";
import { COLLECTIONS } from "@/services/pb/constants";
import { useOrderCompletionMutations } from "./useOrderCompletionMutations";

const pbMocks = vi.hoisted(() => ({ collection: vi.fn(), update: vi.fn() }));
vi.mock("@/services/pb/client", () => ({ pb: { collection: pbMocks.collection } }));

const queryKey = ["customer", "order-1"];

const setup = (mountCut: boolean) => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const customer = {
    customerId: "customer-1",
    orderDetails: {
      orderId: "order-1",
      mountCut,
      artworkComplete: true,
      framingComplete: false,
      orderStatus: "in_progress",
    },
  } as NormalisedCustomer;
  queryClient.setQueryData(queryKey, customer);
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useOrderCompletionMutations("order-1"), { wrapper });

  return {
    ...hook,
    queryClient,
    customer,
    cachedOrder: () => queryClient.getQueryData<NormalisedCustomer>(queryKey)?.orderDetails,
  };
};

beforeEach(() => {
  pbMocks.collection.mockReset().mockReturnValue({ update: pbMocks.update });
  pbMocks.update.mockReset();
});

describe("useOrderCompletionMutations mount cut", () => {
  it.each([true, false])("optimistically saves mountCut %s without changing completion or status", async (next) => {
    let finish: () => void = () => {};
    pbMocks.update.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { result, cachedOrder, queryClient, unmount } = setup(!next);
    let saving!: Promise<unknown>;
    act(() => {
      saving = result.current.updateOrderCompletion({ orderId: "order-1", mountCut: next });
    });

    await waitFor(() => {
      expect(cachedOrder()?.mountCut).toBe(next);
      expect(result.current.isSavingCompletion).toBe(true);
      expect(pbMocks.update).toHaveBeenCalledWith("order-1", { mountCut: next });
    });
    expect(pbMocks.collection).toHaveBeenCalledWith(COLLECTIONS.ORDERS);
    expect(cachedOrder()).toMatchObject({ artworkComplete: true, framingComplete: false, orderStatus: "in_progress" });

    await act(async () => { finish(); await saving; });
    await waitFor(() => expect(result.current.isSavingCompletion).toBe(false));
    expect(cachedOrder()?.mountCut).toBe(next);
    expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
    unmount();
    queryClient.clear();
  });

  it("restores the previous cached value when the save fails", async () => {
    let fail: (error: Error) => void = () => {};
    pbMocks.update.mockImplementation(() => new Promise<void>((_resolve, reject) => { fail = reject; }));
    const { result, customer, cachedOrder, queryClient, unmount } = setup(false);
    let saving!: Promise<unknown>;
    act(() => {
      saving = result.current.updateOrderCompletion({ orderId: "order-1", mountCut: true }).catch((error: unknown) => error);
    });

    await waitFor(() => {
      expect(cachedOrder()?.mountCut).toBe(true);
      expect(pbMocks.update).toHaveBeenCalled();
    });
    const error = new Error("Unable to save mount cut");
    await act(async () => { fail(error); expect(await saving).toBe(error); });

    expect(queryClient.getQueryData(queryKey)).toEqual(customer);
    await waitFor(() => expect(result.current.isSavingCompletion).toBe(false));
    unmount();
    queryClient.clear();
  });
});
