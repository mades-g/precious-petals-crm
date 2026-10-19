import { describe, expect, it } from "vitest";

import { deriveRecommendationReminderSummary } from "./deriveRecommendationReminderSummary";
import type { EmailLogEntry } from "../types";

const buildLog = (overrides: Partial<EmailLogEntry>): EmailLogEntry => ({
  id: overrides.id ?? "log-1",
  status: overrides.status ?? "sent",
  emailType: overrides.emailType ?? "recommendation_bouquet",
  eventType: overrides.eventType ?? "bouquet_recommendation",
  sentAt: overrides.sentAt ?? "2026-04-01T09:00:00.000Z",
  meta: overrides.meta ?? null,
});

describe("deriveRecommendationReminderSummary", () => {
  it("returns not eligible when there is no bouquet data", () => {
    const summary = deriveRecommendationReminderSummary({
      logs: [],
      orderStatus: "to_choose",
      paymentStatus: "waiting_second_deposit",
      hasBouquetData: false,
      hasCustomerEmail: true,
    });

    expect(summary.status).toBe("not_eligible");
    expect(summary.blockedReason).toBe("No bouquet data.");
  });

  it("returns not started when the initial recommendation email has not been sent", () => {
    const summary = deriveRecommendationReminderSummary({
      logs: [],
      orderStatus: "to_choose",
      paymentStatus: "waiting_second_deposit",
      hasBouquetData: true,
      hasCustomerEmail: true,
    });

    expect(summary.status).toBe("not_started");
    expect(summary.blockedReason).toBe(
      "Initial recommendation email has not been sent.",
    );
  });

  it("returns not eligible when the customer email is missing", () => {
    const summary = deriveRecommendationReminderSummary({
      logs: [buildLog({ sentAt: "2026-04-01T09:00:00.000Z" })],
      orderStatus: "to_choose",
      paymentStatus: "waiting_second_deposit",
      hasBouquetData: true,
      hasCustomerEmail: false,
    });

    expect(summary.status).toBe("not_eligible");
    expect(summary.blockedReason).toBe("Customer email is missing.");
  });

  it("shows a scheduled reminder before the 14 day threshold", () => {
    const summary = deriveRecommendationReminderSummary({
      logs: [buildLog({ sentAt: "2026-04-01T09:00:00.000Z" })],
      orderStatus: "to_choose",
      paymentStatus: "waiting_second_deposit",
      hasBouquetData: true,
      hasCustomerEmail: true,
      now: new Date("2026-04-10T12:00:00.000Z"),
    });

    expect(summary.status).toBe("scheduled");
    expect(summary.daysUntilNextReminder).toBe(5);
    expect(summary.nextReminderDueDate).toBe("2026-04-15");
  });

  it("shows due today when the next reminder reaches the threshold", () => {
    const summary = deriveRecommendationReminderSummary({
      logs: [buildLog({ sentAt: "2026-04-01T09:00:00.000Z" })],
      orderStatus: "to_choose",
      paymentStatus: "waiting_second_deposit",
      hasBouquetData: true,
      hasCustomerEmail: true,
      now: new Date("2026-04-15T08:30:00.000Z"),
    });

    expect(summary.status).toBe("due_today");
    expect(summary.daysUntilNextReminder).toBe(0);
    expect(summary.nextReminderDueDate).toBe("2026-04-15");
  });

  it("shows overdue when the next reminder is late", () => {
    const summary = deriveRecommendationReminderSummary({
      logs: [buildLog({ sentAt: "2026-04-01T09:00:00.000Z" })],
      orderStatus: "to_choose",
      paymentStatus: "waiting_second_deposit",
      hasBouquetData: true,
      hasCustomerEmail: true,
      now: new Date("2026-04-18T09:00:00.000Z"),
    });

    expect(summary.status).toBe("overdue");
    expect(summary.daysOverdue).toBe(3);
    expect(summary.nextReminderDueDate).toBe("2026-04-15");
  });

  it("counts automated reminders separately and moves the next due date forward", () => {
    const summary = deriveRecommendationReminderSummary({
      logs: [
        buildLog({
          id: "manual-initial",
          sentAt: "2026-04-01T09:00:00.000Z",
          eventType: "bouquet_recommendation",
        }),
        buildLog({
          id: "auto-followup",
          sentAt: "2026-04-15T10:00:00.000Z",
          eventType: "bouquet_recommendation_followup",
          meta: { source: "cron_recommendation_followup" },
        }),
      ],
      orderStatus: "to_choose",
      paymentStatus: "waiting_second_deposit",
      hasBouquetData: true,
      hasCustomerEmail: true,
      now: new Date("2026-04-20T09:00:00.000Z"),
    });

    expect(summary.automatedReminderCount).toBe(1);
    expect(summary.successfulRecommendationCount).toBe(2);
    expect(summary.status).toBe("scheduled");
    expect(summary.nextReminderDueDate).toBe("2026-04-29");
    expect(summary.lastReminderSentAt).toBe("2026-04-15T10:00:00.000Z");
  });

  it("treats additional manual recommendation emails as filling the cadence without counting them as automated reminders", () => {
    const summary = deriveRecommendationReminderSummary({
      logs: [
        buildLog({
          id: "manual-initial",
          sentAt: "2026-04-01T09:00:00.000Z",
          eventType: "bouquet_recommendation",
        }),
        buildLog({
          id: "manual-second",
          sentAt: "2026-04-15T10:00:00.000Z",
          eventType: "bouquet_recommendation",
          meta: { source: "staff_manual_send" },
        }),
      ],
      orderStatus: "to_choose",
      paymentStatus: "waiting_second_deposit",
      hasBouquetData: true,
      hasCustomerEmail: true,
      now: new Date("2026-04-20T09:00:00.000Z"),
    });

    expect(summary.automatedReminderCount).toBe(0);
    expect(summary.successfulRecommendationCount).toBe(2);
    expect(summary.status).toBe("scheduled");
    expect(summary.nextReminderDueDate).toBe("2026-04-29");
  });

  it("stops reminders once the order is no longer waiting for choices", () => {
    const summary = deriveRecommendationReminderSummary({
      logs: [buildLog({ sentAt: "2026-04-01T09:00:00.000Z" })],
      orderStatus: "chosen",
      paymentStatus: "waiting_second_deposit",
      hasBouquetData: true,
      hasCustomerEmail: true,
      now: new Date("2026-04-16T09:00:00.000Z"),
    });

    expect(summary.status).toBe("stopped");
    expect(summary.blockedReason).toBe(
      "Order is no longer waiting for choices.",
    );
  });

  it("stops reminders once payment reaches second deposit or later", () => {
    const summary = deriveRecommendationReminderSummary({
      logs: [buildLog({ sentAt: "2026-04-01T09:00:00.000Z" })],
      orderStatus: "to_choose",
      paymentStatus: "second_deposit_paid",
      hasBouquetData: true,
      hasCustomerEmail: true,
      now: new Date("2026-04-16T09:00:00.000Z"),
    });

    expect(summary.status).toBe("stopped");
    expect(summary.blockedReason).toBe(
      "Second deposit or later payment stage reached.",
    );
  });

  it("flags a failed automated reminder after the last successful recommendation", () => {
    const summary = deriveRecommendationReminderSummary({
      logs: [
        buildLog({
          id: "manual-initial",
          sentAt: "2026-04-01T09:00:00.000Z",
          eventType: "bouquet_recommendation",
        }),
        buildLog({
          id: "failed-followup",
          status: "failed",
          sentAt: "2026-04-16T09:00:00.000Z",
          eventType: "bouquet_recommendation_followup",
          meta: { source: "cron_recommendation_followup" },
        }),
      ],
      orderStatus: "to_choose",
      paymentStatus: "waiting_second_deposit",
      hasBouquetData: true,
      hasCustomerEmail: true,
      now: new Date("2026-04-16T12:00:00.000Z"),
    });

    expect(summary.status).toBe("overdue");
    expect(summary.hasFailedReminderAfterLastSuccess).toBe(true);
    expect(summary.lastFailedReminderAt).toBe("2026-04-16T09:00:00.000Z");
  });
});
