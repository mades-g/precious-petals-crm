import type { BouquetItemFormValues } from "@/pages/home/components/create-new-customer-form/create-new-customer-form";

export const mapBouquetToFrameItemPayload = (bq: BouquetItemFormValues, preservationDate?: string | null) => ({
    price:
      (typeof bq.framePrice === "number" ? bq.framePrice : 0) +
      (typeof bq.mountPrice === "number" ? bq.mountPrice : 0),
    frameType: bq.frameType,
    layout: bq.layout,
    frameMountColour: bq.mountColour,
    sizeX: bq.measuredWidthIn,
    sizeY: bq.measuredHeightIn,
    extras: {
      measuredWidthIn: bq.measuredWidthIn,
      measuredHeightIn: bq.measuredHeightIn,
      recommendedSizeWidthIn: bq.recommendedSizeWidthIn,
      recommendedSizeHeightIn: bq.recommendedSizeHeightIn,
      framePrice: bq.framePrice,
      mountPrice: bq.mountPrice,
    },
    preservationType: bq.preservationType,
    preservationDate: preservationDate,
  })
