// src/api/update-bouquet.ts

import { pb } from "@/services/pb/client";
import { COLLECTIONS } from "@/services/pb/constants";
import type { OrderFrameItemsResponse } from "@/services/pb/types";

type FrameExtras = {
  measuredWidthIn: number | null;
  measuredHeightIn: number | null;
  recommendedSizeWidthIn: number | null;
  recommendedSizeHeightIn: number | null;
  framePrice: number | null;
  mountPrice: number | null;
};

export type UpdateBouquetPayload = {
  frameId: string;

  // main editable fields (all optional so you can pass only what changed)
  price?: number;
  frameType?: string;
  layout?: string;
  glassType?: string | null;
  frameMountColour?: string | null;
  inclusions?: string | null;
  glassEngraving?: string;

  sizeX?: string;
  sizeY?: string;

  artistHours?: number | null;
  extras?: FrameExtras | null;

  preservationType?: string;
  special_notes?: string;
  preservationDate?: string | null;
  artworkComplete?: boolean;
  framingComplete?: boolean;
};

export async function updateBouquet(
  payload: UpdateBouquetPayload,
): Promise<OrderFrameItemsResponse<FrameExtras>> {
  const { frameId, ...data } = payload;

  return pb
    .collection(COLLECTIONS.ORDER_FRAME_ITMES)
    .update<OrderFrameItemsResponse<FrameExtras>>(frameId, data);
}
