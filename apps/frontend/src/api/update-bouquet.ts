import { pb } from "@/services/pb/client"
import { COLLECTIONS } from "@/services/pb/constants"
import type { OrderFrameItemsResponse } from "@/services/pb/types"

import type { FrameExtras } from "./types"

export type UpdateBouquetPayload = {
  frameId: string
  price?: number
  frameType?: string
  layout?: string
  glassType?: string | null
  frameMountColour?: string | null
  inclusions?: string | null
  glassEngraving?: string
  sizeX?: string
  sizeY?: string
  artistHours?: number | null
  extras?: FrameExtras | null
  preservationType?: string
  special_notes?: string
  preservationDate?: string | null
  artworkComplete?: boolean
  framingComplete?: boolean
}

export const updateBouquet = async ({frameId, ...data}: UpdateBouquetPayload): Promise<OrderFrameItemsResponse<FrameExtras>> => pb
    .collection(COLLECTIONS.ORDER_FRAME_ITEMS)
    .update<OrderFrameItemsResponse<FrameExtras>>(frameId, data)
