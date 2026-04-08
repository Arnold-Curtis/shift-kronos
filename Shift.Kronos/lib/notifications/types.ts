import {
  NotificationEvent,
  NotificationEventStatus,
  Reminder,
  ReminderPriority,
  ReminderType,
} from "@prisma/client";

export const NOTIFICATION_TRANSPORT_TELEGRAM = "telegram";
export const NOTIFICATION_SOURCE = {
  REMINDER: "REMINDER",
  TIMETABLE: "TIMETABLE",
} as const;

export type NotificationSourceKind = (typeof NOTIFICATION_SOURCE)[keyof typeof NOTIFICATION_SOURCE];

export const TELEGRAM_CALLBACK_VERSION = "v1";

export const TELEGRAM_ACTIONS = {
  COMPLETE_REMINDER: "complete-reminder",
  SNOOZE_REMINDER: "snooze-reminder",
  ACK_TIMETABLE: "ack-timetable",
} as const;

export type TelegramActionType = (typeof TELEGRAM_ACTIONS)[keyof typeof TELEGRAM_ACTIONS];

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
  chatId: string;
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
  actionPayloads: TelegramCallbackPayload[];
};

export type TimetableDueItem = DueItemBase & {
  sourceType: typeof NOTIFICATION_SOURCE.TIMETABLE;
  sourceId: string;
  startsAt: Date;
  endsAt: Date;
  reminderLeadMinutes: number;
  actionPayloads: TelegramCallbackPayload[];
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

export type TelegramCallbackPayload =
  | {
      version: typeof TELEGRAM_CALLBACK_VERSION;
      action: typeof TELEGRAM_ACTIONS.COMPLETE_REMINDER;
      reminderId: string;
      occurrenceKey: string;
    }
  | {
      version: typeof TELEGRAM_CALLBACK_VERSION;
      action: typeof TELEGRAM_ACTIONS.SNOOZE_REMINDER;
      reminderId: string;
      occurrenceKey: string;
      minutes: number;
    }
  | {
      version: typeof TELEGRAM_CALLBACK_VERSION;
      action: typeof TELEGRAM_ACTIONS.ACK_TIMETABLE;
      timetableEntryId: string;
      occurrenceKey?: string;
    };

export type TelegramSendMessageInput = {
  chatId: string;
  text: string;
  inlineKeyboard?: Array<Array<{ text: string; callbackData: string }>>;
};

export type TelegramSendMessageResult = {
  ok: boolean;
  messageId: string | null;
  errorMessage: string | null;
};

export type TelegramCallbackActionResult = {
  ok: boolean;
  message: string;
};
