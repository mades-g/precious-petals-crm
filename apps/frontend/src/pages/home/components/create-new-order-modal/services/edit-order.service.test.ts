import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CLEARVIEW_GLASS_TYPE,
  COLLECTIONS,
  DEFAULT_FRAME_GLASS_TYPE,
} from "@/services/pb/constants";

import type {
  BouquetItemFormValues,
  CreateOrderFormValues,
} from "../../create-new-customer-form/create-new-customer-form";

import { editOrderStage } from "./edit-order.service";

const mocks = vi.hoisted(() => {
  const frameItemsApi = {
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  };
  const ordersApi = {
    update: vi.fn(),
  };
  const collection = vi.fn();

  return {
    collection,
    frameItemsApi,
    ordersApi,
  };
});

vi.mock("@/services/pb/client", () => ({
  pb: {
    collection: mocks.collection,
  },
}));

const buildBouquet = (
  overrides: Partial<BouquetItemFormValues> = {},
): BouquetItemFormValues => ({
  id: "frame-1",
  measuredWidthIn: 10,
  measuredHeightIn: 12,
  layout: "Hand tied birds eye",
  recommendedSizeWidthIn: 14,
  recommendedSizeHeightIn: 16,
  preservationType: "3D",
  preservationDate: "2026-04-21",
  frameType: "Black",
  framePrice: 150,
  mountColour: "No Second Mount",
  mountPrice: null,
  glassEngraving: "",
  glassEngravingPrice: null,
  glassType: DEFAULT_FRAME_GLASS_TYPE,
  glassPrice: null,
  inclusions: "No",
  specialNotes: "",
  ...overrides,
});

const buildFormValues = (
  bouquets: BouquetItemFormValues[],
): CreateOrderFormValues => ({
  orderNo: 1,
  title: "",
  firstName: "Ada",
  surname: "Lovelace",
  email: "ada@example.com",
  telephone: "01234",
  howRecommended: "",
  deliveryAddress: "",
  occasionDate: "2026-04-21",
  bouquets,
  hasPaperweight: false,
  paperweightQuantity: null,
  paperweightPrice: null,
  paperweightReceived: false,
  deliverySameAsBilling: true,
  billingAddressLine1: "1 Test Street",
  billingTown: "London",
  billingPostcode: "SW1A 1AA",
});

describe("editOrderStage bouquet_data", () => {
  beforeEach(() => {
    mocks.collection.mockReset();
    mocks.frameItemsApi.create.mockReset();
    mocks.frameItemsApi.delete.mockReset();
    mocks.frameItemsApi.update.mockReset();
    mocks.ordersApi.update.mockReset();

    mocks.frameItemsApi.create.mockResolvedValue({ id: "frame-created" });
    mocks.frameItemsApi.delete.mockResolvedValue({});
    mocks.frameItemsApi.update.mockResolvedValue({});
    mocks.ordersApi.update.mockResolvedValue({});

    mocks.collection.mockImplementation((collectionName: string) => {
      if (collectionName === COLLECTIONS.ORDER_FRAME_ITEMS) {
        return mocks.frameItemsApi;
      }
      if (collectionName === COLLECTIONS.ORDERS) {
        return mocks.ordersApi;
      }
      throw new Error(`Unexpected collection: ${collectionName}`);
    });
  });

  it("deletes an existing bouquet removed from the edit form", async () => {
    const removedBouquet = buildBouquet({ id: "frame-1", framePrice: 100 });
    const keptBouquet = buildBouquet({ id: "frame-2", framePrice: 200 });

    const result = await editOrderStage({
      stage: "bouquet_data",
      values: buildFormValues([keptBouquet]),
      currentCustomerForm: {
        orderId: "order-1",
        bouquets: [removedBouquet, keptBouquet],
      },
    });

    expect(result).toEqual({ ok: true });
    expect(mocks.frameItemsApi.update).toHaveBeenCalledWith(
      "frame-2",
      expect.objectContaining({ price: 200 }),
    );
    expect(mocks.frameItemsApi.delete).toHaveBeenCalledWith("frame-1");
    expect(mocks.ordersApi.update).toHaveBeenCalledWith("order-1", {
      frameOrderId: ["frame-2"],
    });
  });

  it("creates new bouquets and writes the submitted bouquet order", async () => {
    const existingBouquet = buildBouquet({ id: "frame-1" });
    const newBouquet = buildBouquet({
      id: undefined,
      framePrice: 250,
      glassType: CLEARVIEW_GLASS_TYPE,
      glassPrice: 45,
    });

    const result = await editOrderStage({
      stage: "bouquet_data",
      values: buildFormValues([newBouquet, existingBouquet]),
      currentCustomerForm: {
        orderId: "order-1",
        bouquets: [existingBouquet],
      },
    });

    expect(result).toEqual({ ok: true });
    expect(mocks.frameItemsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ price: 250 }),
      { requestKey: "extra-0" },
    );
    expect(mocks.frameItemsApi.update).toHaveBeenCalledWith(
      "frame-1",
      expect.any(Object),
    );
    expect(mocks.ordersApi.update).toHaveBeenCalledWith("order-1", {
      frameOrderId: ["frame-created", "frame-1"],
    });
  });
});
