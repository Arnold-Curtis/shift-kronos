import {
  NotificationEventStatus,
  NotificationSourceType,
  Prisma,
  ReminderStatus,
  ReminderType,
} from "@prisma/client";
import { addMinutes, subMinutes } from "date-fns";
import { db } from "@/lib/db";
import { formatDateTimeLabel } from "@/lib/datetime";
import {
  createReminderDedupeKey,
  createReminderOccurrenceKey,
  createTimetableDedupeKey,
  createTimetableOccurrenceKey,
  describeReminderMetadata,
} from "@/lib/notifications/keys";
import {
  buildReminderActionPayloads,
  buildTimetableActionPayloads,
  formatDueItemEmail,
} from "@/lib/notifications/email-format";
import { sendNotificationEmail } from "@/lib/notifications/email";
import { resolveNotificationRecipientEmail } from "@/lib/notifications/recipients";
import {
  DeliveryDispatchResult,
  DueItem,
  DueReminderRecord,
  NOTIFICATION_SOURCE,
  NOTIFICATION_TRANSPORT_EMAIL,
  NotificationActionResult,
  NotificationDispatchReport,
  ReminderDueItem,
  TimetableDueItem,
} from "@/lib/notifications/types";
import { logInfo, logWarn } from "@/lib/observability/logger";
import { getNextRecurringDueAt } from "@/lib/reminders/recurrence";
import { updateReminderStatus } from "@/lib/reminders/service";
import { getTimetableOccurrencesInRange } from "@/lib/timetable/service";

const DISPATCH_MAX_RETRIES = 2;
const DISPATCH_RETRY_BASE_DELAY_MS = 500;
const TIMETABLE_LOOKBACK_MINUTES = 60;

function isTransientEmailError(errorMessage: string | null) {
  if (!errorMessage) {
    return false;
  }

  const transientSignals = [
    "timeout",
    "timed out",
    "rate limit",
    "too many requests",
    "429",
    "network",
    "service unavailable",
    "503",
    "502",
    "504",
    "temporarily unavailable",
    "econnreset",
    "econnrefused",
    "etimedout",
  ];
  const lower = errorMessage.toLowerCase();

  return transientSignals.some((signal) => lower.includes(signal));
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

export function buildReminderDueItem(reminder: DueReminderRecord, recipientEmail: string, now: Date): ReminderDueItem | null {
  const occurrenceDate = getDueReminderOccurrenceDate(reminder, now);

  if (!occurrenceDate || occurrenceDate.getTime() > now.getTime()) {
    return null;
  }

  const occurrenceKey = createReminderOccurrenceKey(reminder.id, occurrenceDate);

  return {
    sourceType: NOTIFICATION_SOURCE.REMINDER,
    sourceId: reminder.id,
    userId: reminder.userId,
    recipientEmail,
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
    actionPayloads: buildReminderActionPayloads(reminder.userId, reminder.id, occurrenceKey, now),
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
  recipientEmail: string,
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
    recipientEmail,
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
    actionPayloads: buildTimetableActionPayloads(userId, occurrence.entryId, occurrenceKey, now),
  };
}

export async function getDueReminderNotifications(now: Date = new Date()) {
  const users = await db.user.findMany({
    select: {
      id: true,
      clerkUserId: true,
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

  const results = await Promise.all(
    users.map(async (user) => {
      const recipientEmail = await resolveNotificationRecipientEmail(user.clerkUserId);

      if (!recipientEmail) {
        return [] as ReminderDueItem[];
      }

      return user.reminders
        .filter((reminder) => reminder.type !== ReminderType.INBOX)
        .map((reminder) => buildReminderDueItem(reminder, recipientEmail, now))
        .filter((item): item is ReminderDueItem => item !== null);
    }),
  );

  return results.flat();
}

export async function getDueTimetableNotifications(now: Date = new Date()) {
  const users = await db.user.findMany({
    select: {
      id: true,
      clerkUserId: true,
    },
  });

  const lookbackStart = subMinutes(now, TIMETABLE_LOOKBACK_MINUTES);

  const results = await Promise.all(
    users.map(async (user) => {
      const recipientEmail = await resolveNotificationRecipientEmail(user.clerkUserId);

      if (!recipientEmail) {
        return [] as TimetableDueItem[];
      }

      const occurrences = await getTimetableOccurrencesInRange(user.id, {
        start: lookbackStart,
        end: addMinutes(now, 7 * 24 * 60),
      });

      return occurrences
        .map((occurrence) => buildTimetableDueItem(occurrence, user.id, recipientEmail, now))
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
  const dueItems = candidates.filter((item) => !existingKeys.has(item.dedupeKey));

  return {
    dueItems,
    skippedCount: candidates.length - dueItems.length,
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
      transport: NOTIFICATION_TRANSPORT_EMAIL,
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

  if (dueItems.length === 0) {
    logInfo("notifications.dispatch.empty", { skippedCount });
    return {
      selectedCount: 0,
      skippedCount,
      deliveredCount: 0,
      failedCount: 0,
      results,
    };
  }

  logInfo("notifications.dispatch.start", {
    candidateCount: dueItems.length,
    skippedCount,
  });

  for (const dueItem of dueItems) {
    let reservation;

    try {
      reservation = await reserveNotification(dueItem);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        logWarn("notifications.dispatch.duplicate_reservation", {
          dedupeKey: dueItem.dedupeKey,
        });
        continue;
      }

      if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
        logWarn("notifications.dispatch.duplicate_reservation", {
          dedupeKey: dueItem.dedupeKey,
        });
        continue;
      }

      throw error;
    }

    const message = formatDueItemEmail(dueItem);
    let sendResult = await sendNotificationEmail(message);
    let attempt = 1;

    while (!sendResult.ok && attempt <= DISPATCH_MAX_RETRIES && isTransientEmailError(sendResult.errorMessage)) {
      const delay = DISPATCH_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logWarn("notifications.dispatch.transient_retry", {
        dedupeKey: dueItem.dedupeKey,
        attempt,
        nextDelayMs: delay,
        errorMessage: sendResult.errorMessage,
      });
      await sleep(delay);
      sendResult = await sendNotificationEmail(message);
      attempt++;
    }

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

    const failureReason = sendResult.errorMessage ?? "Unknown email error.";
    await markNotificationFailed(reservation.id, failureReason);
    logWarn("notifications.dispatch.delivery_failed", {
      dedupeKey: dueItem.dedupeKey,
      attempts: attempt,
      failureReason,
    });
    results.push({
      reservationId: reservation.id,
      dedupeKey: reservation.dedupeKey,
      status: NotificationEventStatus.FAILED,
      providerMessageId: null,
      failureReason,
    });
  }

  const deliveredCount = results.filter((result) => result.status === NotificationEventStatus.DELIVERED).length;
  const failedCount = results.filter((result) => result.status === NotificationEventStatus.FAILED).length;

  logInfo("notifications.dispatch.complete", {
    selectedCount: dueItems.length,
    deliveredCount,
    failedCount,
    skippedCount,
  });

  return {
    selectedCount: dueItems.length,
    skippedCount,
    deliveredCount,
    failedCount,
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
    } satisfies NotificationActionResult;
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
    } satisfies NotificationActionResult;
  }

  await updateReminderStatus(userId, {
    id: reminderId,
    status: "COMPLETED",
  });

  return {
    ok: true,
    message: "Reminder completed.",
  } satisfies NotificationActionResult;
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
    } satisfies NotificationActionResult;
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
  } satisfies NotificationActionResult;
}

export async function acknowledgeTimetableNotification(
  userId: string,
  timetableEntryId: string,
  occurrenceKey: string | null,
) {
  const event = await db.notificationEvent.findFirst({
    where: {
      userId,
      timetableEntryId,
      sourceType: NotificationSourceType.TIMETABLE,
      ...(occurrenceKey
        ? {
            sourceOccurrenceKey: occurrenceKey,
          }
        : {}),
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
  } satisfies NotificationActionResult;
}
