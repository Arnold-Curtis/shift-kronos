import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getNotificationActionSecret } from "@/lib/operations/env";
import {
  NOTIFICATION_ACTIONS,
  NOTIFICATION_ACTION_VERSION,
  NotificationActionPayload,
  NotificationActionType,
} from "@/lib/notifications/types";

export const snoozeMinutes = [10, 30, 60] as const;

type NotificationActionPayloadWithoutTiming = Omit<NotificationActionPayload, "version" | "issuedAt" | "expiresAt">;

const completeReminderPayloadSchema = z.object({
  version: z.literal(NOTIFICATION_ACTION_VERSION),
  userId: z.string().min(1),
  action: z.literal(NOTIFICATION_ACTIONS.COMPLETE_REMINDER),
  reminderId: z.string().min(1),
  occurrenceKey: z.string().min(1),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

const snoozeReminderPayloadSchema = z.object({
  version: z.literal(NOTIFICATION_ACTION_VERSION),
  userId: z.string().min(1),
  action: z.literal(NOTIFICATION_ACTIONS.SNOOZE_REMINDER),
  reminderId: z.string().min(1),
  occurrenceKey: z.string().min(1),
  minutes: z.union(snoozeMinutes.map((value) => z.literal(value)) as [z.ZodLiteral<10>, z.ZodLiteral<30>, z.ZodLiteral<60>]),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

const ackTimetablePayloadSchema = z.object({
  version: z.literal(NOTIFICATION_ACTION_VERSION),
  userId: z.string().min(1),
  action: z.literal(NOTIFICATION_ACTIONS.ACK_TIMETABLE),
  timetableEntryId: z.string().min(1),
  occurrenceKey: z.string().min(1).optional(),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

const actionPayloadSchema = z.discriminatedUnion("action", [
  completeReminderPayloadSchema,
  snoozeReminderPayloadSchema,
  ackTimetablePayloadSchema,
]);

function sign(value: string) {
  return createHmac("sha256", getNotificationActionSecret()).update(value).digest("base64url");
}

function encodeValue(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeValue(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function buildExpiringActionPayload<T extends NotificationActionPayloadWithoutTiming>(
  payload: T,
  now: Date = new Date(),
  expiresInMs: number = 7 * 24 * 60 * 60 * 1000,
) {
  return {
    ...payload,
    version: NOTIFICATION_ACTION_VERSION,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + expiresInMs).toISOString(),
  } as unknown as NotificationActionPayload;
}

export function encodeNotificationActionToken(payload: NotificationActionPayload) {
  const encodedPayload = encodeValue(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function decodeNotificationActionToken(token: string, now: Date = new Date()) {
  const [encodedPayload, providedSignature] = token.split(".");

  if (!encodedPayload || !providedSignature) {
    throw new Error("Invalid notification action token.");
  }

  const expectedSignature = sign(encodedPayload);
  const provided = Buffer.from(providedSignature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new Error("Invalid notification action signature.");
  }

  const payload = actionPayloadSchema.parse(JSON.parse(decodeValue(encodedPayload))) as NotificationActionPayload;

  if (new Date(payload.expiresAt).getTime() < now.getTime()) {
    throw new Error("Notification action link has expired.");
  }

  return payload;
}

export function isReminderAction(action: NotificationActionType) {
  return action === NOTIFICATION_ACTIONS.COMPLETE_REMINDER || action === NOTIFICATION_ACTIONS.SNOOZE_REMINDER;
}
