import type {
  EmailLogEntry,
  RecommendationReminderSummary,
} from "../types";

const LONDON_TIME_ZONE = "Europe/London";
const REMINDER_INTERVAL_DAYS = 14;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const STOPPED_PAYMENT_STATUSES = new Set([
  "second_deposit_paid",
  "waiting_final_balance",
  "final_balance_paid",
]);

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? "";

const parseTimestamp = (value?: string | null) => {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const toLondonDateOnly = (value: Date) => {
  const parts = dateFormatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
};

const toLondonDayIndex = (value: Date) => {
  const dateOnly = toLondonDateOnly(value);
  if (!dateOnly) return null;

  const [year, month, day] = dateOnly.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_IN_MS);
};

const fromDayIndex = (dayIndex: number) =>
  new Date(dayIndex * DAY_IN_MS).toISOString().slice(0, 10);

const getMetaSource = (log: Pick<EmailLogEntry, "meta">) => {
  const source = log.meta?.source;
  return typeof source === "string" ? normalize(source) : "";
};

export const isAutomatedRecommendationFollowUpLog = (
  log: Pick<EmailLogEntry, "eventType" | "meta">,
) =>
  normalize(log.eventType) === "bouquet_recommendation_followup" ||
  getMetaSource(log) === "cron_recommendation_followup";

export const isRecommendationEmailLog = (
  log: Pick<EmailLogEntry, "emailType" | "eventType">,
) => {
  const emailType = normalize(log.emailType);
  const eventType = normalize(log.eventType);

  return (
    emailType === "recommendation_bouquet" ||
    eventType === "bouquet_recommendation" ||
    eventType === "bouquet_recommendation_followup"
  );
};

const toDatedLogs = (logs: EmailLogEntry[]) =>
  logs
    .map((log) => {
      const sentAt = parseTimestamp(log.sentAt);
      if (!sentAt) return null;
      return { log, sentAt };
    })
    .filter((item): item is { log: EmailLogEntry; sentAt: Date } => item != null)
    .sort((left, right) => left.sentAt.getTime() - right.sentAt.getTime());

type DeriveRecommendationReminderSummaryInput = {
  logs: EmailLogEntry[];
  orderStatus?: string | null;
  paymentStatus?: string | null;
  hasBouquetData: boolean;
  hasCustomerEmail: boolean;
  now?: Date;
};

export const deriveRecommendationReminderSummary = ({
  logs,
  orderStatus,
  paymentStatus,
  hasBouquetData,
  hasCustomerEmail,
  now = new Date(),
}: DeriveRecommendationReminderSummaryInput): RecommendationReminderSummary => {
  const successfulRecommendationLogs = toDatedLogs(
    logs.filter(
      (log) => normalize(log.status) === "sent" && isRecommendationEmailLog(log),
    ),
  );
  const successfulReminderLogs = toDatedLogs(
    logs.filter(
      (log) =>
        normalize(log.status) === "sent" &&
        isAutomatedRecommendationFollowUpLog(log),
    ),
  );
  const failedReminderLogs = toDatedLogs(
    logs.filter(
      (log) =>
        normalize(log.status) === "failed" &&
        isAutomatedRecommendationFollowUpLog(log),
    ),
  );

  const successfulRecommendationCount = successfulRecommendationLogs.length;
  const automatedReminderCount = successfulReminderLogs.length;
  const firstRecommendation = successfulRecommendationLogs[0];
  const latestSuccessfulRecommendation =
    successfulRecommendationLogs[successfulRecommendationLogs.length - 1];
  const latestSuccessfulReminder =
    successfulReminderLogs[successfulReminderLogs.length - 1];
  const latestFailedReminder = failedReminderLogs[failedReminderLogs.length - 1];

  const baseSummary = {
    automatedReminderCount,
    successfulRecommendationCount,
    firstRecommendationSentAt: firstRecommendation?.log.sentAt,
    lastReminderSentAt: latestSuccessfulReminder?.log.sentAt,
    lastFailedReminderAt: latestFailedReminder?.log.sentAt,
    hasFailedReminderAfterLastSuccess:
      Boolean(latestFailedReminder) &&
      Boolean(latestSuccessfulRecommendation) &&
      latestFailedReminder.sentAt.getTime() >
        latestSuccessfulRecommendation.sentAt.getTime(),
  };

  if (!hasBouquetData) {
    return {
      ...baseSummary,
      status: "not_eligible",
      blockedReason: "No bouquet data.",
    };
  }

  if (!hasCustomerEmail) {
    return {
      ...baseSummary,
      status: "not_eligible",
      blockedReason: "Customer email is missing.",
    };
  }

  if (successfulRecommendationCount === 0 || !firstRecommendation) {
    return {
      ...baseSummary,
      status: "not_started",
      blockedReason: "Initial recommendation email has not been sent.",
    };
  }

  if (STOPPED_PAYMENT_STATUSES.has(normalize(paymentStatus))) {
    return {
      ...baseSummary,
      status: "stopped",
      blockedReason: "Second deposit or later payment stage reached.",
    };
  }

  if (normalize(orderStatus) !== "to_choose") {
    return {
      ...baseSummary,
      status: "stopped",
      blockedReason: "Order is no longer waiting for choices.",
    };
  }

  const todayIndex = toLondonDayIndex(now);
  const firstSuccessIndex = toLondonDayIndex(firstRecommendation.sentAt);
  if (todayIndex == null || firstSuccessIndex == null) {
    return {
      ...baseSummary,
      status: "scheduled",
    };
  }

  const nextDueIndex =
    firstSuccessIndex + successfulRecommendationCount * REMINDER_INTERVAL_DAYS;
  const dayDelta = nextDueIndex - todayIndex;
  const nextReminderDueDate = fromDayIndex(nextDueIndex);

  if (dayDelta > 0) {
    return {
      ...baseSummary,
      status: "scheduled",
      nextReminderDueDate,
      daysUntilNextReminder: dayDelta,
    };
  }

  if (dayDelta === 0) {
    return {
      ...baseSummary,
      status: "due_today",
      nextReminderDueDate,
      daysUntilNextReminder: 0,
    };
  }

  return {
    ...baseSummary,
    status: "overdue",
    nextReminderDueDate,
    daysOverdue: Math.abs(dayDelta),
  };
};
