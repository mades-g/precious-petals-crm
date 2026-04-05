import type { NormalisedCustomer } from "@/api/get-customers";
import { formatDate } from "@/utils";
import type {
  EmailContext,
  OrderDetails,
  OrderExtrasDraft,
  OrderFrame,
  OrderPaperweight,
  Totals,
} from "../types";

export type BuildEmailPayloadInput = {
  customer: NormalisedCustomer | null | undefined;
  order: OrderDetails | null | undefined;
  frames: OrderFrame[];
  paperweight: OrderPaperweight;
  extras: OrderExtrasDraft;
  totals: Totals;
  emailContext?: EmailContext;
};

const buildMergedInvoiceNotes = (
  notes: string,
  frames: Array<{
    inclusions?: string;
    specialNotes?: string;
  }>,
) => {
  const lines: string[] = [];
  const seen = new Set<string>();

  const normalizeInclusionDetails = (value?: string) =>
    value
      ?.split(/\r?\n/)
      .map((part) => part.trim())
      .filter(Boolean)
      .join(", ") ?? "";

  const appendLine = (value?: string) => {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    lines.push(trimmed);
  };

  const buildInclusionLabel = (index: number) =>
    frames.length > 1 ? `Bouquet #${index + 1} Include` : "Include";

  appendLine(notes);

  frames.forEach((frame, index) => {
    const inclusions = frame.inclusions?.trim();
    const label = buildInclusionLabel(index);
    if (inclusions === "Buttonhole") {
      appendLine(`${label}: Buttonhole`);
      return;
    }
    const inclusionDetails = normalizeInclusionDetails(frame.specialNotes);
    if (inclusions === "Yes" && inclusionDetails) {
      appendLine(`${label}: ${inclusionDetails}`);
    }
  });

  return lines.join("\n");
};

export const buildEmailPayload = ({
  customer,
  order,
  frames,
  paperweight,
  extras,
  totals,
  emailContext,
}: BuildEmailPayloadInput) => {
  const invoiceFrames = frames.map((frame) => {
    const legacyFrame = frame as OrderFrame & { special_notes?: string };

    return {
      size: frame.measuredSize ?? "",
      measuredSize: frame.measuredSize ?? "",
      recommendedSize: frame.recommendedSize ?? "",
      frameType: frame.frameType ?? "",
      glassType: frame.glassType ?? "",
      layout: frame.layout ?? "",
      preservationType: frame.preservationType ?? "",
      inclusions: frame.inclusions ?? "",
      specialNotes: frame.specialNotes ?? legacyFrame.special_notes ?? "",
      mountColour: frame.mountColour ?? "",
      glassEngraving: frame.glassEngraving ?? "",
      price: frame.price,
      extras: frame.extras,
    };
  });

  return {
    customer: {
      id: customer?.customerId,
      title: customer?.title ?? undefined,
      firstName: customer?.firstName ?? "",
      surname: customer?.surname ?? "",
      email: customer?.email ?? "",
      displayName: customer?.displayName,
      phoneNumber: customer?.phoneNumber ?? "",
    },
    order: {
      orderId: order?.orderId,
      orderNo: order?.orderNo,
      created: order?.created ? formatDate(order.created) : "",
      occasionDate: order?.occasionDate ? formatDate(order.occasionDate) : "",
      requiredBy: order?.requiredBy ?? "",
      billingAddressLine1: order?.billingAddressLine1,
      billingAddressLine2: order?.billingAddressLine2,
      billingTown: order?.billingTown,
      billingCounty: order?.billingCounty,
      billingPostcode: order?.billingPostcode,
    },
    orderExtras: {
      replacementFlowers: extras.replacementFlowers,
      replacementFlowersPrice: extras.replacementFlowersPrice,
      collection: extras.collection,
      collectionPrice: extras.collectionPrice,
      delivery: extras.delivery,
      deliveryPrice: extras.deliveryPrice,
      recreateButtonhole: extras.recreateButtonhole,
      recreateButtonholePrice: extras.recreateButtonholePrice,
      returnUnusedFlowers: extras.returnUnusedFlowers,
      returnUnusedFlowersPrice: extras.returnUnusedFlowersPrice,
      notes: buildMergedInvoiceNotes(extras.notes, invoiceFrames),
    },
    frames: invoiceFrames,
    paperweight,
    totals,
    emailContext,
  };
};
