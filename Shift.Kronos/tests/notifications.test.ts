import {
  ReminderPriority,
  ReminderStatus,
  ReminderType,
  RecurrenceFrequency,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  buildReminderDueItem,
  buildTimetableDueItem,
  getDueReminderOccurrenceDate,
  isReminderDue,
} from "@/lib/notifications/service";
import { createReminderDedupeKey, createTimetableDedupeKey } from "@/lib/notifications/keys";
import { decodeTelegramCallbackPayload, encodeTelegramCallbackPayload } from "@/lib/notifications/telegram-callbacks";
import { formatDueItemMessage } from "@/lib/notifications/telegram-format";
import { NOTIFICATION_SOURCE, TELEGRAM_ACTIONS } from "@/lib/notifications/types";

describe("notification reminder selection", () => {
  const recurringReminder = {
    id: "rem_1",
    userId: "user_1",
    title: "Take vitamins",
    description: "After breakfast",
    type: ReminderType.RECURRING,
    priority: ReminderPriority.MEDIUM,
    category: "health",
    tags: [],
    dueAt: new Date("2026-04-01T08:00:00.000Z"),
    recurrenceFrequency: RecurrenceFrequency.DAILY,
    recurrenceInterval: 1,
    recurrenceDays: [],
    recurrenceEndAt: null,
    status: ReminderStatus.ACTIVE,
    completedAt: null,
    snoozedUntil: null,
  };

  it("computes the effective due occurrence for recurring reminders", () => {
    const occurrence = getDueReminderOccurrenceDate(
      recurringReminder,
      new Date("2026-04-05T09:00:00.000Z"),
    );

    expect(occurrence?.toISOString()).toBe("2026-04-06T08:00:00.000Z");
  });

  it("suppresses reminders that are snoozed into the future", () => {
    expect(
      isReminderDue(
        {
          ...recurringReminder,
          type: ReminderType.ONE_TIME,
          dueAt: new Date("2026-04-05T08:00:00.000Z"),
          recurrenceFrequency: null,
          recurrenceInterval: null,
          snoozedUntil: new Date("2026-04-05T10:00:00.000Z"),
        },
        new Date("2026-04-05T09:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("builds a due item for an overdue one-time reminder", () => {
    const dueItem = buildReminderDueItem(
      {
        ...recurringReminder,
        type: ReminderType.ONE_TIME,
        dueAt: new Date("2026-04-05T08:00:00.000Z"),
        recurrenceFrequency: null,
        recurrenceInterval: null,
      },
      "123456",
      new Date("2026-04-05T08:30:00.000Z"),
    );

    expect(dueItem?.sourceType).toBe(NOTIFICATION_SOURCE.REMINDER);
    expect(dueItem?.actionPayloads).toHaveLength(4);
    expect(dueItem?.dedupeKey).toBe(
      createReminderDedupeKey("rem_1", new Date("2026-04-05T08:00:00.000Z")),
    );
  });
});

describe("notification timetable selection", () => {
  it("builds a due class alert once the lead-time threshold has passed", () => {
    const dueItem = buildTimetableDueItem(
      {
        entryId: "class_1",
        subject: "Operating Systems",
        location: "Hall A",
        lecturer: null,
        startsAt: new Date("2026-04-05T09:00:00.000Z"),
        endsAt: new Date("2026-04-05T11:00:00.000Z"),
        reminderLeadMinutes: 30,
      },
      "user_1",
      "123456",
      new Date("2026-04-05T08:40:00.000Z"),
    );

    expect(dueItem?.sourceType).toBe(NOTIFICATION_SOURCE.TIMETABLE);
    expect(dueItem?.notifyAt.toISOString()).toBe("2026-04-05T08:30:00.000Z");
    expect(dueItem?.dedupeKey).toBe(
      createTimetableDedupeKey("class_1", new Date("2026-04-05T09:00:00.000Z"), 30),
    );
  });

  it("does not build a class alert before the lead-time threshold", () => {
    const dueItem = buildTimetableDueItem(
      {
        entryId: "class_1",
        subject: "Operating Systems",
        location: "Hall A",
        lecturer: null,
        startsAt: new Date("2026-04-05T09:00:00.000Z"),
        endsAt: new Date("2026-04-05T11:00:00.000Z"),
        reminderLeadMinutes: 30,
      },
      "user_1",
      "123456",
      new Date("2026-04-05T08:20:00.000Z"),
    );

    expect(dueItem).toBeNull();
  });
});

describe("telegram callback payloads", () => {
  it("encodes and decodes reminder callbacks safely", () => {
    const payload = {
      version: "v1" as const,
      action: TELEGRAM_ACTIONS.SNOOZE_REMINDER,
      reminderId: "rem_1",
      occurrenceKey: "rem_1:2026-04-05T08:00:00Z",
      minutes: 30 as const,
    };

    const encoded = encodeTelegramCallbackPayload(payload);
    const decoded = decodeTelegramCallbackPayload(encoded);

    expect(decoded).toEqual(payload);
  });

  it("encodes timetable callbacks within Telegram callback_data limits", () => {
    const payload = {
      version: "v1" as const,
      action: TELEGRAM_ACTIONS.ACK_TIMETABLE,
      timetableEntryId: "class_1234567890abcdef",
    };

    const encoded = encodeTelegramCallbackPayload(payload);
    const decoded = decodeTelegramCallbackPayload(encoded);

    expect(encoded.length).toBeLessThanOrEqual(64);
    expect(decoded).toEqual(payload);
  });
});

describe("telegram message formatting", () => {
  it("formats reminder notifications with action buttons", () => {
    const message = formatDueItemMessage({
      sourceType: NOTIFICATION_SOURCE.REMINDER,
      sourceId: "rem_1",
      userId: "user_1",
      chatId: "123456",
      title: "Submit assignment",
      bodyLines: ["one time | high priority | school", "Before the portal closes"],
      notifyAt: new Date("2026-04-05T08:00:00.000Z"),
      dedupeKey: "dedupe-1",
      sourceOccurrenceKey: "occ-1",
      reminderType: ReminderType.ONE_TIME,
      priority: ReminderPriority.HIGH,
      actionPayloads: [
        {
          version: "v1",
          action: TELEGRAM_ACTIONS.COMPLETE_REMINDER,
          reminderId: "rem_1",
          occurrenceKey: "occ-1",
        },
        {
          version: "v1",
          action: TELEGRAM_ACTIONS.SNOOZE_REMINDER,
          reminderId: "rem_1",
          occurrenceKey: "occ-1",
          minutes: 10,
        },
        {
          version: "v1",
          action: TELEGRAM_ACTIONS.SNOOZE_REMINDER,
          reminderId: "rem_1",
          occurrenceKey: "occ-1",
          minutes: 30,
        },
        {
          version: "v1",
          action: TELEGRAM_ACTIONS.SNOOZE_REMINDER,
          reminderId: "rem_1",
          occurrenceKey: "occ-1",
          minutes: 60,
        },
      ],
    });

    expect(message.text).toContain("Reminder: Submit assignment");
    expect(message.inlineKeyboard).toHaveLength(2);
  });

  it("formats timetable notifications with an acknowledge action", () => {
    const message = formatDueItemMessage({
      sourceType: NOTIFICATION_SOURCE.TIMETABLE,
      sourceId: "class_1",
      userId: "user_1",
      chatId: "123456",
      title: "Operating Systems",
      bodyLines: ["Location: Hall A", "Alerted 30 minutes before class."],
      notifyAt: new Date("2026-04-05T08:30:00.000Z"),
      startsAt: new Date("2026-04-05T09:00:00.000Z"),
      endsAt: new Date("2026-04-05T11:00:00.000Z"),
      reminderLeadMinutes: 30,
      dedupeKey: "dedupe-2",
      sourceOccurrenceKey: "occ-2",
      actionPayloads: [
        {
          version: "v1",
          action: TELEGRAM_ACTIONS.ACK_TIMETABLE,
          timetableEntryId: "class_1",
          occurrenceKey: "occ-2",
        },
      ],
    });

    expect(message.text).toContain("Class alert: Operating Systems");
    expect(message.inlineKeyboard?.[0]?.[0]?.text).toBe("Acknowledge");
    expect(message.inlineKeyboard?.[0]?.[0]?.callbackData.length).toBeLessThanOrEqual(64);
  });
});
