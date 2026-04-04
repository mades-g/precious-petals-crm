import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { pb } from "@/services/pb/client";
import { COLLECTIONS } from "@/services/pb/constants";
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
  OrderStatusDraft,
  OrderPaperweight,
  Totals,
} from "../types";
import type { NormalisedCustomer } from "@/api/get-customers";

export type UseEmailActionsInput = {
  customer: NormalisedCustomer | null | undefined;
  order: OrderDetails | null | undefined;
  currentOrderStatus: OrderStatusDraft;
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
  currentOrderStatus,
  frames,
  paperweight,
  extras,
  totals,
}: UseEmailActionsInput) => {
  const [status, setStatus] = useState<EmailActionStatus | null>(null);
  const queryClient = useQueryClient();

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
        frameItemId: frames.length === 1 ? frames[0]?.frameId : undefined,
        paperweightItemId: paperweight?.paperWeightId ?? undefined,
      },
    });

    try {
      if (action.endpoint === "invoice") {
        await postEmailInvoice(payload);
      } else if (action.endpoint === "recommendation") {
        await postEmailRecommendation(payload);
      } else {
        await pb.send("/api/email/delivery-collect", {
          method: "POST",
          body: payload,
        });
      }

      if (
        action.endpoint === "recommendation" &&
        order?.orderId &&
        currentOrderStatus === "draft"
      ) {
        await pb.collection(COLLECTIONS.ORDERS).update(order.orderId, {
          orderStatus: "to_choose",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (order?.orderId) {
        queryClient.invalidateQueries({ queryKey: ["customer", order.orderId] });
        queryClient.invalidateQueries({ queryKey: ["email_logs", order.orderId] });
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
