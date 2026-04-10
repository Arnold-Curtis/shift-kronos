import {
  ReminderPriority,
  ReminderStatus,
  ReminderType,
  RecurrenceFrequency,
} from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildReminderDueItem,
  buildTimetableDueItem,
  getDueReminderOccurrenceDate,
  getDueTimetableNotifications,
  isReminderDue,
} from "@/lib/notifications/service";
import { createReminderDedupeKey, createTimetableDedupeKey } from "@/lib/notifications/keys";
import { decodeNotificationActionToken, encodeNotificationActionToken } from "@/lib/notifications/action-tokens";
import { formatDueItemEmail } from "@/lib/notifications/email-format";
import { NOTIFICATION_ACTIONS, NOTIFICATION_SOURCE } from "@/lib/notifications/types";

const dbMocks = vi.hoisted(() => ({
  userFindMany: vi.fn(),
}));

const timetableServiceMocks = vi.hoisted(() => ({
  getTimetableOccurrencesInRange: vi.fn(),
}));

const recipientMocks = vi.hoisted(() => ({
  resolveNotificationRecipientEmail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findMany: dbMocks.userFindMany,
    },
  },
}));

vi.mock("@/lib/timetable/service", () => ({
  getTimetableOccurrencesInRange: timetableServiceMocks.getTimetableOccurrencesInRange,
}));

vi.mock("@/lib/notifications/recipients", () => ({
  resolveNotificationRecipientEmail: recipientMocks.resolveNotificationRecipientEmail,
}));

beforeEach(() => {
  process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/shift_kronos";
  process.env.CLERK_SECRET_KEY = "sk_test_123";
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_123";
  process.env.NEXT_PUBLIC_APP_URL = "https://shift-kronos.test";
  process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_token";
  process.env.RESEND_API_KEY = "resend-key";
  process.env.NOTIFICATION_FROM_EMAIL = "notificationstoarnold@divasglamke.com";
  process.env.NOTIFICATION_TO_EMAIL = "arnoldmbici@gmail.com";
  process.env.GEMINI_API_KEY = "gemini_api_key";
  process.env.GROQ_API_KEY = "groq_api_key";
  process.env.OPENROUTER_API_KEY = "openrouter_api_key";
  process.env.OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
  process.env.PHASE7_CRON_SECRET = "phase7-cron-secret";
  process.env.PHASE7_NOTIFICATION_ACTION_SECRET = "phase7-notification-secret";
});

afterEach(() => {
  dbMocks.userFindMany.mockReset();
  timetableServiceMocks.getTimetableOccurrencesInRange.mockReset();
  recipientMocks.resolveNotificationRecipientEmail.mockReset();
  vi.clearAllMocks();
});

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
    const occurrence = getDueReminderOccurrenceDate(recurringReminder, new Date("2026-04-05T09:00:00.000Z"));

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
      "arnoldmbici@gmail.com",
      new Date("2026-04-05T08:30:00.000Z"),
    );

    expect(dueItem?.sourceType).toBe(NOTIFICATION_SOURCE.REMINDER);
    expect(dueItem?.recipientEmail).toBe("arnoldmbici@gmail.com");
    expect(dueItem?.actionPayloads).toHaveLength(4);
    expect(dueItem?.dedupeKey).toBe(createReminderDedupeKey("rem_1", new Date("2026-04-05T08:00:00.000Z")));
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
      "arnoldmbici@gmail.com",
      new Date("2026-04-05T08:40:00.000Z"),
    );

    expect(dueItem?.sourceType).toBe(NOTIFICATION_SOURCE.TIMETABLE);
    expect(dueItem?.notifyAt.toISOString()).toBe("2026-04-05T08:30:00.000Z");
    expect(dueItem?.dedupeKey).toBe(createTimetableDedupeKey("class_1", new Date("2026-04-05T09:00:00.000Z"), 30));
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
      "arnoldmbici@gmail.com",
      new Date("2026-04-05T08:20:00.000Z"),
    );

    expect(dueItem).toBeNull();
  });

  it("selects recently-due timetable alerts from the lookback window", async () => {
    dbMocks.userFindMany.mockResolvedValue([
      {
        id: "user_1",
        clerkUserId: "clerk_1",
      },
    ]);
    recipientMocks.resolveNotificationRecipientEmail.mockResolvedValue("arnoldmbici@gmail.com");
    timetableServiceMocks.getTimetableOccurrencesInRange.mockResolvedValue([
      {
        entryId: "class_1",
        subject: "Operating Systems",
        location: "Hall A",
        lecturer: "Dr. Mensah",
        startsAt: new Date("2026-04-05T09:00:00.000Z"),
        endsAt: new Date("2026-04-05T11:00:00.000Z"),
        reminderLeadMinutes: 30,
      },
    ]);

    const now = new Date("2026-04-05T08:35:00.000Z");
    const dueItems = await getDueTimetableNotifications(now);

    expect(timetableServiceMocks.getTimetableOccurrencesInRange).toHaveBeenCalledWith("user_1", {
      start: new Date("2026-04-05T07:35:00.000Z"),
      end: new Date("2026-04-12T08:35:00.000Z"),
    });
    expect(dueItems).toHaveLength(1);
    expect(dueItems[0]).toMatchObject({
      recipientEmail: "arnoldmbici@gmail.com",
      sourceType: NOTIFICATION_SOURCE.TIMETABLE,
      sourceId: "class_1",
    });
    expect(dueItems[0]?.notifyAt.toISOString()).toBe("2026-04-05T08:30:00.000Z");
  });

  it("skips users without any email destination", async () => {
    dbMocks.userFindMany.mockResolvedValue([
      {
        id: "user_1",
        clerkUserId: "clerk_1",
      },
    ]);
    recipientMocks.resolveNotificationRecipientEmail.mockResolvedValue(null);

    const dueItems = await getDueTimetableNotifications(new Date("2026-04-05T08:35:00.000Z"));

    expect(timetableServiceMocks.getTimetableOccurrencesInRange).not.toHaveBeenCalled();
    expect(dueItems).toEqual([]);
  });
});

describe("notification action tokens", () => {
  it("encodes and decodes reminder actions safely", () => {
    const payload = {
      version: "v1" as const,
      userId: "user_1",
      action: NOTIFICATION_ACTIONS.SNOOZE_REMINDER,
      reminderId: "rem_1",
      occurrenceKey: "rem_1:2026-04-05T08:00:00Z",
      minutes: 30 as const,
      issuedAt: "2026-04-05T08:00:00.000Z",
      expiresAt: "2026-04-12T08:00:00.000Z",
    };

    const encoded = encodeNotificationActionToken(payload);
    const decoded = decodeNotificationActionToken(encoded, new Date("2026-04-06T08:00:00.000Z"));

    expect(decoded).toEqual(payload);
  });

  it("rejects expired action tokens", () => {
    const payload = {
      version: "v1" as const,
      userId: "user_1",
      action: NOTIFICATION_ACTIONS.ACK_TIMETABLE,
      timetableEntryId: "class_1234567890abcdef",
      occurrenceKey: "occ-1",
      issuedAt: "2026-04-01T08:00:00.000Z",
      expiresAt: "2026-04-02T08:00:00.000Z",
    };

    const encoded = encodeNotificationActionToken(payload);

    expect(() => decodeNotificationActionToken(encoded, new Date("2026-04-06T08:00:00.000Z"))).toThrow(/expired/i);
  });
});

describe("email message formatting", () => {
  it("formats reminder notifications with signed action links", () => {
    const message = formatDueItemEmail({
      sourceType: NOTIFICATION_SOURCE.REMINDER,
      sourceId: "rem_1",
      userId: "user_1",
      recipientEmail: "arnoldmbici@gmail.com",
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
          userId: "user_1",
          action: NOTIFICATION_ACTIONS.COMPLETE_REMINDER,
          reminderId: "rem_1",
          occurrenceKey: "occ-1",
          issuedAt: "2026-04-05T08:00:00.000Z",
          expiresAt: "2026-04-12T08:00:00.000Z",
        },
        {
          version: "v1",
          userId: "user_1",
          action: NOTIFICATION_ACTIONS.SNOOZE_REMINDER,
          reminderId: "rem_1",
          occurrenceKey: "occ-1",
          minutes: 10,
          issuedAt: "2026-04-05T08:00:00.000Z",
          expiresAt: "2026-04-12T08:00:00.000Z",
        },
        {
          version: "v1",
          userId: "user_1",
          action: NOTIFICATION_ACTIONS.SNOOZE_REMINDER,
          reminderId: "rem_1",
          occurrenceKey: "occ-1",
          minutes: 30,
          issuedAt: "2026-04-05T08:00:00.000Z",
          expiresAt: "2026-04-12T08:00:00.000Z",
        },
        {
          version: "v1",
          userId: "user_1",
          action: NOTIFICATION_ACTIONS.SNOOZE_REMINDER,
          reminderId: "rem_1",
          occurrenceKey: "occ-1",
          minutes: 60,
          issuedAt: "2026-04-05T08:00:00.000Z",
          expiresAt: "2026-04-12T08:00:00.000Z",
        },
      ],
    });

    expect(message.subject).toContain("Reminder: Submit assignment");
    expect(message.text).toContain("Complete:");
    expect(message.html).toContain("Snooze 10m");
    expect(message.to).toBe("arnoldmbici@gmail.com");
  });

  it("formats timetable notifications with an acknowledge action link", () => {
    const message = formatDueItemEmail({
      sourceType: NOTIFICATION_SOURCE.TIMETABLE,
      sourceId: "class_1",
      userId: "user_1",
      recipientEmail: "arnoldmbici@gmail.com",
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
          userId: "user_1",
          action: NOTIFICATION_ACTIONS.ACK_TIMETABLE,
          timetableEntryId: "class_1",
          occurrenceKey: "occ-2",
          issuedAt: "2026-04-05T08:00:00.000Z",
          expiresAt: "2026-04-12T08:00:00.000Z",
        },
      ],
    });

    expect(message.subject).toContain("Class alert: Operating Systems");
    expect(message.text).toContain("Acknowledge:");
    expect(message.html).toContain("Acknowledge");
  });
});
