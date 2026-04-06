import {
  NotificationEventStatus,
  NotificationSourceType,
  ReminderStatus,
  ReminderType,
} from "@prisma/client";
import { addMinutes, subMinutes } from "date-fns";
import { db } from "@/lib/db";
import { formatDateTimeLabel } from "@/lib/datetime";
import { getServerEnv } from "@/lib/env";
import {
  createReminderDedupeKey,
  createReminderOccurrenceKey,
  createTimetableDedupeKey,
  createTimetableOccurrenceKey,
  describeReminderMetadata,
} from "@/lib/notifications/keys";
import { formatDueItemMessage } from "@/lib/notifications/telegram-format";
import { TELEGRAM_ACTIONS } from "@/lib/notifications/types";
import {
  DeliveryDispatchResult,
  DueItem,
  DueReminderRecord,
  NOTIFICATION_SOURCE,
  NotificationDispatchReport,
  ReminderDueItem,
  TelegramCallbackActionResult,
  TimetableDueItem,
} from "@/lib/notifications/types";
import { sendTelegramMessage } from "@/lib/notifications/telegram";
import { getNextRecurringDueAt } from "@/lib/reminders/recurrence";
import { updateReminderStatus } from "@/lib/reminders/service";
import { getTimetableCollections } from "@/lib/timetable/service";

function getFallbackChatId() {
  return getServerEnv().TELEGRAM_CHAT_ID ?? null;
}

function resolveChatId(chatId: string | null | undefined) {
  return chatId ?? getFallbackChatId();
}

export function getDueReminderOccurrenceDate(reminder: DueReminderRecord, now: Date) {
  if (reminder.snoozedUntil && reminder.snoozedUntil > now) {
    return null;
  }

  if (reminder.snoozedUntil && reminder.snoozedUntil <= now) {
    return reminder.snoozedUntil;
  }

  if (reminder.type === ReminderType.RECURRING || reminder.type === ReminderType.HABIT) {
    return getNextRecurringDueAt(reminder as never, now);
  }

  return reminder.dueAt;
}

export function isReminderDue(reminder: DueReminderRecord, now: Date) {
  if (reminder.status !== ReminderStatus.ACTIVE) {
    return false;
  }

  const occurrenceDate = getDueReminderOccurrenceDate(reminder, now);

  if (!occurrenceDate) {
    return false;
  }

  return occurrenceDate.getTime() <= now.getTime();
}

export function buildReminderDueItem(reminder: DueReminderRecord, chatId: string, now: Date): ReminderDueItem | null {
  const occurrenceDate = getDueReminderOccurrenceDate(reminder, now);

  if (!occurrenceDate || occurrenceDate.getTime() > now.getTime()) {
    return null;
  }

  const occurrenceKey = createReminderOccurrenceKey(reminder.id, occurrenceDate);

    return {
    sourceType: NOTIFICATION_SOURCE.REMINDER,
    sourceId: reminder.id,
    userId: reminder.userId,
    chatId,
    title: reminder.title,
    bodyLines: [
      describeReminderMetadata(reminder.type, reminder.priority, reminder.category),
      reminder.description ?? "",
    ].filter(Boolean),
    notifyAt: occurrenceDate,
    dedupeKey: createReminderDedupeKey(reminder.id, occurrenceDate),
    sourceOccurrenceKey: occurrenceKey,
    reminderType: reminder.type,
    priority: reminder.priority,
    actionPayloads: [
      {
        version: "v1",
        action: TELEGRAM_ACTIONS.COMPLETE_REMINDER,
        reminderId: reminder.id,
        occurrenceKey,
      },
      {
        version: "v1",
        action: TELEGRAM_ACTIONS.SNOOZE_REMINDER,
        reminderId: reminder.id,
        occurrenceKey,
        minutes: 10,
      },
      {
        version: "v1",
        action: TELEGRAM_ACTIONS.SNOOZE_REMINDER,
        reminderId: reminder.id,
        occurrenceKey,
        minutes: 30,
      },
      {
        version: "v1",
        action: TELEGRAM_ACTIONS.SNOOZE_REMINDER,
        reminderId: reminder.id,
        occurrenceKey,
        minutes: 60,
      },
    ],
  };
}

export function buildTimetableDueItem(
  occurrence: {
    entryId: string;
    subject: string;
    location: string | null;
    lecturer: string | null;
    startsAt: Date;
    endsAt: Date;
    reminderLeadMinutes: number;
  },
  userId: string,
  chatId: string,
  now: Date,
): TimetableDueItem | null {
  const notifyAt = subMinutes(occurrence.startsAt, occurrence.reminderLeadMinutes);

  if (notifyAt.getTime() > now.getTime()) {
    return null;
  }

  const occurrenceKey = createTimetableOccurrenceKey(occurrence.entryId, occurrence.startsAt);

  return {
    sourceType: NOTIFICATION_SOURCE.TIMETABLE,
    sourceId: occurrence.entryId,
    userId,
    chatId,
    title: occurrence.subject,
    bodyLines: [
      occurrence.location ? `Location: ${occurrence.location}` : "",
      occurrence.lecturer ? `Lecturer: ${occurrence.lecturer}` : "",
      `Alerted ${occurrence.reminderLeadMinutes} minutes before class.`,
    ].filter(Boolean),
    notifyAt,
    startsAt: occurrence.startsAt,
    endsAt: occurrence.endsAt,
    reminderLeadMinutes: occurrence.reminderLeadMinutes,
    dedupeKey: createTimetableDedupeKey(occurrence.entryId, occurrence.startsAt, occurrence.reminderLeadMinutes),
    sourceOccurrenceKey: occurrenceKey,
    actionPayloads: [
      {
        version: "v1",
        action: TELEGRAM_ACTIONS.ACK_TIMETABLE,
        timetableEntryId: occurrence.entryId,
        occurrenceKey,
      },
    ],
  };
}

export async function getDueReminderNotifications(now: Date = new Date()) {
  const users = await db.user.findMany({
    select: {
      id: true,
      telegramChatId: true,
      reminders: {
        where: {
          status: ReminderStatus.ACTIVE,
        },
        select: {
          id: true,
          userId: true,
          title: true,
          description: true,
          type: true,
          priority: true,
          category: true,
          tags: true,
          dueAt: true,
          recurrenceFrequency: true,
          recurrenceInterval: true,
          recurrenceDays: true,
          recurrenceEndAt: true,
          status: true,
          completedAt: true,
          snoozedUntil: true,
        },
      },
    },
  });

  return users.flatMap((user) => {
    const chatId = resolveChatId(user.telegramChatId);

    if (!chatId) {
      return [];
    }

    return user.reminders
      .filter((reminder) => reminder.type !== ReminderType.INBOX)
      .map((reminder) => buildReminderDueItem(reminder, chatId, now))
      .filter((item): item is ReminderDueItem => item !== null);
  });
}

export async function getDueTimetableNotifications(now: Date = new Date()) {
  const users = await db.user.findMany({
    select: {
      id: true,
      telegramChatId: true,
    },
  });

  const results = await Promise.all(
    users.map(async (user) => {
      const chatId = resolveChatId(user.telegramChatId);

      if (!chatId) {
        return [] as TimetableDueItem[];
      }

      const timetable = await getTimetableCollections(user.id, addMinutes(now, 7 * 24 * 60));

      return timetable.weekly
        .map((occurrence) => buildTimetableDueItem(occurrence, user.id, chatId, now))
        .filter((item): item is TimetableDueItem => item !== null);
    }),
  );

  return results.flat();
}

export async function getPendingDueItems(now: Date = new Date()) {
  const [reminderItems, timetableItems] = await Promise.all([
    getDueReminderNotifications(now),
    getDueTimetableNotifications(now),
  ]);

  const candidates = [...reminderItems, ...timetableItems].sort(
    (left, right) => left.notifyAt.getTime() - right.notifyAt.getTime(),
  );

  const existingEvents = await db.notificationEvent.findMany({
    where: {
      dedupeKey: {
        in: candidates.map((item) => item.dedupeKey),
      },
      status: {
        in: [NotificationEventStatus.PENDING, NotificationEventStatus.DELIVERED],
      },
    },
    select: {
      dedupeKey: true,
    },
  });

  const existingKeys = new Set(existingEvents.map((event) => event.dedupeKey));

  return {
    dueItems: candidates.filter((item) => !existingKeys.has(item.dedupeKey)),
    skippedCount: candidates.length - candidates.filter((item) => !existingKeys.has(item.dedupeKey)).length,
  };
}

export async function reserveNotification(dueItem: DueItem) {
  return db.notificationEvent.create({
    data: {
      userId: dueItem.userId,
      reminderId: dueItem.sourceType === NOTIFICATION_SOURCE.REMINDER ? dueItem.sourceId : null,
      timetableEntryId: dueItem.sourceType === NOTIFICATION_SOURCE.TIMETABLE ? dueItem.sourceId : null,
      sourceType: dueItem.sourceType,
      sourceOccurrenceKey: dueItem.sourceOccurrenceKey,
      transport: "telegram",
      dedupeKey: dueItem.dedupeKey,
      status: NotificationEventStatus.PENDING,
      lastAttemptAt: new Date(),
    },
  });
}

export async function markNotificationDelivered(eventId: string, providerMessageId: string | null) {
  return db.notificationEvent.update({
    where: {
      id: eventId,
    },
    data: {
      status: NotificationEventStatus.DELIVERED,
      providerMessageId,
      deliveredAt: new Date(),
      failureReason: null,
      lastAttemptAt: new Date(),
    },
  });
}

export async function markNotificationFailed(eventId: string, reason: string) {
  return db.notificationEvent.update({
    where: {
      id: eventId,
    },
    data: {
      status: NotificationEventStatus.FAILED,
      failureReason: reason,
      lastAttemptAt: new Date(),
    },
  });
}

export async function dispatchPendingNotifications(now: Date = new Date()): Promise<NotificationDispatchReport> {
  const { dueItems, skippedCount } = await getPendingDueItems(now);
  const results: DeliveryDispatchResult[] = [];

  for (const dueItem of dueItems) {
    let reservation;

    try {
      reservation = await reserveNotification(dueItem);
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
        continue;
      }

      throw error;
    }

    const message = formatDueItemMessage(dueItem);
    const sendResult = await sendTelegramMessage(message);

    if (sendResult.ok) {
      await markNotificationDelivered(reservation.id, sendResult.messageId);
      results.push({
        reservationId: reservation.id,
        dedupeKey: reservation.dedupeKey,
        status: NotificationEventStatus.DELIVERED,
        providerMessageId: sendResult.messageId,
        failureReason: null,
      });
      continue;
    }

    await markNotificationFailed(reservation.id, sendResult.errorMessage ?? "Unknown Telegram error.");
    results.push({
      reservationId: reservation.id,
      dedupeKey: reservation.dedupeKey,
      status: NotificationEventStatus.FAILED,
      providerMessageId: null,
      failureReason: sendResult.errorMessage ?? "Unknown Telegram error.",
    });
  }

  return {
    selectedCount: dueItems.length,
    skippedCount,
    deliveredCount: results.filter((result) => result.status === NotificationEventStatus.DELIVERED).length,
    failedCount: results.filter((result) => result.status === NotificationEventStatus.FAILED).length,
    results,
  };
}

export async function completeReminderFromNotification(userId: string, reminderId: string) {
  const reminder = await db.reminder.findFirst({
    where: {
      id: reminderId,
      userId,
    },
  });

  if (!reminder) {
    return {
      ok: false,
      message: "Reminder not found.",
    } satisfies TelegramCallbackActionResult;
  }

  if (reminder.type === ReminderType.RECURRING || reminder.type === ReminderType.HABIT) {
    const nextDueAt = reminder.dueAt ? getNextRecurringDueAt(reminder, addMinutes(new Date(), 1)) : null;

    await db.reminder.update({
      where: {
        id: reminder.id,
      },
      data: {
        dueAt: nextDueAt,
        snoozedUntil: null,
        completedAt: new Date(),
      },
    });

    return {
      ok: true,
      message: nextDueAt
        ? `Recurring reminder recorded. Next occurrence: ${formatDateTimeLabel(nextDueAt)}.`
        : "Recurring reminder recorded.",
    } satisfies TelegramCallbackActionResult;
  }

  await updateReminderStatus(userId, {
    id: reminderId,
    status: "COMPLETED",
  });

  return {
    ok: true,
    message: "Reminder completed.",
  } satisfies TelegramCallbackActionResult;
}

export async function snoozeReminderFromNotification(userId: string, reminderId: string, minutes: number) {
  const reminder = await db.reminder.findFirst({
    where: {
      id: reminderId,
      userId,
    },
  });

  if (!reminder) {
    return {
      ok: false,
      message: "Reminder not found.",
    } satisfies TelegramCallbackActionResult;
  }

  const base = reminder.snoozedUntil && reminder.snoozedUntil > new Date() ? reminder.snoozedUntil : new Date();
  const snoozedUntil = addMinutes(base, minutes);

  await db.reminder.update({
    where: {
      id: reminder.id,
    },
    data: {
      snoozedUntil,
      status: ReminderStatus.ACTIVE,
    },
  });

  return {
    ok: true,
    message: `Reminder snoozed until ${formatDateTimeLabel(snoozedUntil)}.`,
  } satisfies TelegramCallbackActionResult;
}

export async function acknowledgeTimetableNotification(userId: string, timetableEntryId: string, occurrenceKey: string) {
  const event = await db.notificationEvent.findFirst({
    where: {
      userId,
      timetableEntryId,
      sourceOccurrenceKey: occurrenceKey,
      sourceType: NotificationSourceType.TIMETABLE,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (event) {
    await db.notificationEvent.update({
      where: {
        id: event.id,
      },
      data: {
        actionedAt: new Date(),
      },
    });
  }

  return {
    ok: true,
    message: "Class alert acknowledged.",
  } satisfies TelegramCallbackActionResult;
}
