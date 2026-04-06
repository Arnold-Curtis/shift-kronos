import { z } from "zod";
import {
  TELEGRAM_ACTIONS,
  TELEGRAM_CALLBACK_VERSION,
  TelegramActionType,
  TelegramCallbackPayload,
} from "@/lib/notifications/types";

const snoozeMinutes = [10, 30, 60] as const;

const completeReminderPayloadSchema = z.object({
  version: z.literal(TELEGRAM_CALLBACK_VERSION),
  action: z.literal(TELEGRAM_ACTIONS.COMPLETE_REMINDER),
  reminderId: z.string().min(1),
  occurrenceKey: z.string().min(1),
});

const snoozeReminderPayloadSchema = z.object({
  version: z.literal(TELEGRAM_CALLBACK_VERSION),
  action: z.literal(TELEGRAM_ACTIONS.SNOOZE_REMINDER),
  reminderId: z.string().min(1),
  occurrenceKey: z.string().min(1),
  minutes: z.union(snoozeMinutes.map((value) => z.literal(value)) as [z.ZodLiteral<10>, z.ZodLiteral<30>, z.ZodLiteral<60>]),
});

const ackTimetablePayloadSchema = z.object({
  version: z.literal(TELEGRAM_CALLBACK_VERSION),
  action: z.literal(TELEGRAM_ACTIONS.ACK_TIMETABLE),
  timetableEntryId: z.string().min(1),
  occurrenceKey: z.string().min(1),
});

const callbackPayloadSchema = z.discriminatedUnion("action", [
  completeReminderPayloadSchema,
  snoozeReminderPayloadSchema,
  ackTimetablePayloadSchema,
]);

export function encodeTelegramCallbackPayload(payload: TelegramCallbackPayload) {
  return JSON.stringify(payload);
}

export function decodeTelegramCallbackPayload(value: string) {
  return callbackPayloadSchema.parse(JSON.parse(value)) as TelegramCallbackPayload;
}

export function isReminderAction(action: TelegramActionType) {
  return action === TELEGRAM_ACTIONS.COMPLETE_REMINDER || action === TELEGRAM_ACTIONS.SNOOZE_REMINDER;
}

export { snoozeMinutes };
