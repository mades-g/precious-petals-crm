import { useState } from "react";

import { pb } from "@/services/pb/client";
import {
  postEmailInvoice,
  postEmailRecommendation,
} from "@/services/pb/customRoutes";
import { buildEmailPayload } from "../utils/buildEmailPayload";
import type {
  EmailActionConfig,
  EmailActionStatus,
  OrderDetails,
  OrderExtrasDraft,
  OrderFrame,
  OrderPaperweight,
  Totals,
} from "../types";
import type { NormalisedCustomer } from "@/api/get-customers";

export type UseEmailActionsInput = {
  customer: NormalisedCustomer | null | undefined;
  order: OrderDetails | null | undefined;
  frames: OrderFrame[];
  paperweight: OrderPaperweight;
  extras: OrderExtrasDraft;
  totals: Totals;
};

const getErrorMessage = (err: unknown) => {
  if (err instanceof Error) return err.message;
  return "Failed to send email";
};

export const useEmailActions = ({
  customer,
  order,
  frames,
  paperweight,
  extras,
  totals,
}: UseEmailActionsInput) => {
  const [status, setStatus] = useState<EmailActionStatus | null>(null);

  const canSendEmails = !!pb.authStore.token && typeof pb.baseUrl === "string";

  const sendEmail = async (action: EmailActionConfig, eventNote?: string) => {
    if (!canSendEmails) {
      setStatus({
        actionKey: action.key,
        state: "error",
        message: "You must be logged in to send emails.",
      });
      return;
    }

    setStatus({ actionKey: action.key, state: "sending" });

    const payload = buildEmailPayload({
      customer,
      order,
      frames,
      paperweight,
      extras,
      totals,
      emailContext: {
        emailType: action.emailType,
        eventType: action.eventType,
        templateKey: action.templateKey,
        eventNote,
        orderId: order?.orderId,
        customerId: customer?.customerId,
      },
    });

    try {
      if (action.endpoint === "invoice") {
        await postEmailInvoice(payload);
      } else {
        await postEmailRecommendation(payload);
      }

      setStatus({
        actionKey: action.key,
        state: "success",
        message: `${action.label} sent`,
      });
    } catch (err) {
      setStatus({
        actionKey: action.key,
        state: "error",
        message: getErrorMessage(err),
      });
    }
  };

  return {
    canSendEmails,
    sendEmail,
    emailStatus: status,
  };
};
