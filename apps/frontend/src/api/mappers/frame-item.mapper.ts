import type { BouquetItemFormValues } from "@/pages/home/components/create-new-customer-form/create-new-customer-form";

export const mapBouquetToFrameItemPayload = (
  bq: BouquetItemFormValues,
) => ({
  price:
    (typeof bq.framePrice === "number" ? bq.framePrice : 0) +
    (typeof bq.mountPrice === "number" ? bq.mountPrice : 0) +
    (typeof bq.glassPrice === "number" ? bq.glassPrice : 0) +
    (typeof bq.glassEngravingPrice === "number" ? bq.glassEngravingPrice : 0),
  frameType: bq.frameType,
  layout: bq.layout,
  frameMountColour: bq.mountColour,
  sizeX: bq.measuredWidthIn,
  sizeY: bq.measuredHeightIn,
  glassEngraving: bq.glassEngraving || undefined,
  glassType: bq.glassType || undefined,
  inclusions: bq.inclusions || undefined,
  artworkComplete: bq.artworkComplete,
  framingComplete: bq.framingComplete,
  extras: {
    measuredWidthIn: bq.measuredWidthIn,
    measuredHeightIn: bq.measuredHeightIn,
    recommendedSizeWidthIn: bq.recommendedSizeWidthIn,
    recommendedSizeHeightIn: bq.recommendedSizeHeightIn,
    framePrice: bq.framePrice,
    mountPrice: bq.mountPrice,
    glassPrice: bq.glassPrice,
    glassEngravingPrice: bq.glassEngravingPrice,
  },
  preservationType: bq.preservationType,
  preservationDate: bq.preservationDate || undefined,
});
