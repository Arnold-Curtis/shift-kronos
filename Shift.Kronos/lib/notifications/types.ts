import {
  NotificationEvent,
  NotificationEventStatus,
  Reminder,
  ReminderPriority,
  ReminderType,
} from "@prisma/client";

export const NOTIFICATION_TRANSPORT_EMAIL = "email";
export const NOTIFICATION_SOURCE = {
  REMINDER: "REMINDER",
  TIMETABLE: "TIMETABLE",
} as const;

export type NotificationSourceKind = (typeof NOTIFICATION_SOURCE)[keyof typeof NOTIFICATION_SOURCE];

export const NOTIFICATION_ACTION_VERSION = "v1";

export const NOTIFICATION_ACTIONS = {
  COMPLETE_REMINDER: "complete-reminder",
  SNOOZE_REMINDER: "snooze-reminder",
  ACK_TIMETABLE: "ack-timetable",
} as const;

export type NotificationActionType = (typeof NOTIFICATION_ACTIONS)[keyof typeof NOTIFICATION_ACTIONS];

export type DueReminderRecord = Pick<
  Reminder,
  | "id"
  | "userId"
  | "title"
  | "description"
  | "type"
  | "priority"
  | "category"
  | "tags"
  | "dueAt"
  | "recurrenceFrequency"
  | "recurrenceInterval"
  | "recurrenceDays"
  | "recurrenceEndAt"
  | "status"
  | "completedAt"
  | "snoozedUntil"
>;

type DueItemBase = {
  userId: string;
  recipientEmail: string;
  dedupeKey: string;
  notifyAt: Date;
  sourceOccurrenceKey: string;
  title: string;
  bodyLines: string[];
};

export type ReminderDueItem = DueItemBase & {
  sourceType: typeof NOTIFICATION_SOURCE.REMINDER;
  sourceId: string;
  reminderType: ReminderType;
  priority: ReminderPriority;
  actionPayloads: NotificationActionPayload[];
};

export type TimetableDueItem = DueItemBase & {
  sourceType: typeof NOTIFICATION_SOURCE.TIMETABLE;
  sourceId: string;
  startsAt: Date;
  endsAt: Date;
  reminderLeadMinutes: number;
  actionPayloads: NotificationActionPayload[];
};

export type DueItem = ReminderDueItem | TimetableDueItem;

export type DeliveryReservation = Pick<
  NotificationEvent,
  | "id"
  | "userId"
  | "reminderId"
  | "timetableEntryId"
  | "sourceType"
  | "sourceOccurrenceKey"
  | "transport"
  | "dedupeKey"
  | "status"
  | "providerMessageId"
  | "failureReason"
  | "deliveredAt"
  | "lastAttemptAt"
  | "actionedAt"
  | "createdAt"
>;

export type DeliveryDispatchResult = {
  reservationId: string;
  dedupeKey: string;
  status: NotificationEventStatus;
  providerMessageId: string | null;
  failureReason: string | null;
};

export type NotificationDispatchReport = {
  selectedCount: number;
  skippedCount: number;
  deliveredCount: number;
  failedCount: number;
  results: DeliveryDispatchResult[];
};

export type NotificationActionPayload =
  | {
      version: typeof NOTIFICATION_ACTION_VERSION;
      userId: string;
      action: typeof NOTIFICATION_ACTIONS.COMPLETE_REMINDER;
      reminderId: string;
      occurrenceKey: string;
      issuedAt: string;
      expiresAt: string;
    }
  | {
      version: typeof NOTIFICATION_ACTION_VERSION;
      userId: string;
      action: typeof NOTIFICATION_ACTIONS.SNOOZE_REMINDER;
      reminderId: string;
      occurrenceKey: string;
      minutes: number;
      issuedAt: string;
      expiresAt: string;
    }
  | {
      version: typeof NOTIFICATION_ACTION_VERSION;
      userId: string;
      action: typeof NOTIFICATION_ACTIONS.ACK_TIMETABLE;
      timetableEntryId: string;
      occurrenceKey?: string;
      issuedAt: string;
      expiresAt: string;
    };

export type NotificationEmailAction = {
  label: string;
  href: string;
};

export type NotificationEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type NotificationEmailResult = {
  ok: boolean;
  messageId: string | null;
  errorMessage: string | null;
};

export type NotificationActionResult = {
  ok: boolean;
  message: string;
};
