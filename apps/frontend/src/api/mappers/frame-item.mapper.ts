import type { BouquetItemFormValues } from "@/pages/home/components/create-new-customer-form/create-new-customer-form";
import {
  CLEARVIEW_GLASS_TYPE,
  DEFAULT_FRAME_GLASS_TYPE,
} from "@/services/pb/constants";

export const mapBouquetToFrameItemPayload = (bq: BouquetItemFormValues) => {
  const glassType =
    bq.glassType === CLEARVIEW_GLASS_TYPE
      ? CLEARVIEW_GLASS_TYPE
      : DEFAULT_FRAME_GLASS_TYPE;

  return {
    price: typeof bq.framePrice === "number" ? bq.framePrice : 0,
    frameType: bq.frameType,
    layout: bq.layout,
    frameMountColour: bq.mountColour,
    sizeX: bq.measuredWidthIn,
    sizeY: bq.measuredHeightIn,
    glassEngraving: bq.glassEngraving || undefined,
    glassType,
    inclusions: bq.inclusions || undefined,
    special_notes: bq.inclusions === "Yes" ? bq.specialNotes.trim() : "",
    extras: {
      measuredWidthIn: bq.measuredWidthIn,
      measuredHeightIn: bq.measuredHeightIn,
      recommendedSizeWidthIn: bq.recommendedSizeWidthIn,
      recommendedSizeHeightIn: bq.recommendedSizeHeightIn,
      framePrice: bq.framePrice,
      mountPrice: bq.mountPrice,
      glassPrice:
        glassType === CLEARVIEW_GLASS_TYPE ? bq.glassPrice : null,
      glassEngravingPrice: bq.glassEngravingPrice,
    },
    preservationType: bq.preservationType,
    preservationDate: bq.preservationDate || undefined,
  };
};
