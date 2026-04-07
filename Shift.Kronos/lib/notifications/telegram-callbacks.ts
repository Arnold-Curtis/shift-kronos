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
  occurrenceKey: z.string().min(1).optional(),
});

const callbackPayloadSchema = z.discriminatedUnion("action", [
  completeReminderPayloadSchema,
  snoozeReminderPayloadSchema,
  ackTimetablePayloadSchema,
]);

const compactAckPrefix = "tta:";

function encodeCompactAckPayload(payload: Extract<TelegramCallbackPayload, { action: typeof TELEGRAM_ACTIONS.ACK_TIMETABLE }>) {
  return `${compactAckPrefix}${payload.timetableEntryId}`;
}

function decodeCompactAckPayload(value: string): TelegramCallbackPayload | null {
  if (!value.startsWith(compactAckPrefix)) {
    return null;
  }

  const body = value.slice(compactAckPrefix.length);
  if (!body) {
    throw new Error("Invalid compact timetable callback payload.");
  }

  return ackTimetablePayloadSchema.parse({
    version: TELEGRAM_CALLBACK_VERSION,
    action: TELEGRAM_ACTIONS.ACK_TIMETABLE,
    timetableEntryId: body,
  }) as TelegramCallbackPayload;
}

export function encodeTelegramCallbackPayload(payload: TelegramCallbackPayload) {
  if (payload.action === TELEGRAM_ACTIONS.ACK_TIMETABLE) {
    return encodeCompactAckPayload(payload);
  }

  return JSON.stringify(payload);
}

export function decodeTelegramCallbackPayload(value: string) {
  const compactAckPayload = decodeCompactAckPayload(value);

  if (compactAckPayload) {
    return compactAckPayload;
  }

  return callbackPayloadSchema.parse(JSON.parse(value)) as TelegramCallbackPayload;
}

export function isReminderAction(action: TelegramActionType) {
  return action === TELEGRAM_ACTIONS.COMPLETE_REMINDER || action === TELEGRAM_ACTIONS.SNOOZE_REMINDER;
}

export { snoozeMinutes };
