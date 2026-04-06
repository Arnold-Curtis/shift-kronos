import { ReminderPriority, ReminderStatus, ReminderType, RecurrenceFrequency } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { getCountdownDays } from "@/lib/datetime";
import { getNextRecurringDueAt, getReminderRecurrenceLabel } from "@/lib/reminders/recurrence";
import { createReminderSchema } from "@/lib/reminders/schemas";

describe("reminder schemas", () => {
  it("accepts a valid one-time reminder", () => {
    const result = createReminderSchema.parse({
      title: "Submit assignment",
      type: ReminderType.ONE_TIME,
      priority: ReminderPriority.HIGH,
      tags: ["school"],
      dueAt: new Date("2026-04-10T16:00:00.000Z"),
    });

    expect(result.title).toBe("Submit assignment");
  });

  it("rejects inbox reminders with due dates", () => {
    expect(() =>
      createReminderSchema.parse({
        title: "Think about project idea",
        type: ReminderType.INBOX,
        priority: ReminderPriority.MEDIUM,
        tags: [],
        dueAt: new Date("2026-04-10T16:00:00.000Z"),
      }),
    ).toThrow(/Inbox items should remain unscheduled/);
  });

  it("rejects recurring reminders without recurrence config", () => {
    expect(() =>
      createReminderSchema.parse({
        title: "Weekly planning",
        type: ReminderType.RECURRING,
        priority: ReminderPriority.MEDIUM,
        tags: [],
      }),
    ).toThrow(/require recurrence settings/);
  });

  it("requires weekdays for weekly recurrence", () => {
    expect(() =>
      createReminderSchema.parse({
        title: "Gym",
        type: ReminderType.HABIT,
        priority: ReminderPriority.MEDIUM,
        tags: [],
        recurrence: {
          frequency: RecurrenceFrequency.WEEKLY,
          interval: 1,
          daysOfWeek: [],
        },
      }),
    ).toThrow(/requires at least one selected weekday/);
  });
});

describe("reminder recurrence helpers", () => {
  it("computes the next recurring due date from a baseline", () => {
    const nextDue = getNextRecurringDueAt(
      {
        id: "rem_1",
        userId: "user_1",
        title: "Take vitamins",
        description: null,
        type: ReminderType.RECURRING,
        priority: ReminderPriority.MEDIUM,
        category: null,
        tags: [],
        dueAt: new Date("2026-04-01T08:00:00.000Z"),
        recurrenceRule: null,
        recurrenceFrequency: RecurrenceFrequency.DAILY,
        recurrenceInterval: 1,
        recurrenceDays: [],
        recurrenceEndAt: null,
        status: ReminderStatus.ACTIVE,
        completedAt: null,
        snoozedUntil: null,
        createdAt: new Date("2026-04-01T07:00:00.000Z"),
        updatedAt: new Date("2026-04-01T07:00:00.000Z"),
      },
      new Date("2026-04-05T09:30:00.000Z"),
    );

    expect(nextDue?.toISOString()).toBe("2026-04-06T08:00:00.000Z");
  });

  it("formats a readable recurrence label", () => {
    const label = getReminderRecurrenceLabel({
      id: "rem_2",
      userId: "user_1",
      title: "Review budget",
      description: null,
      type: ReminderType.HABIT,
      priority: ReminderPriority.HIGH,
      category: null,
      tags: [],
      dueAt: new Date("2026-04-01T08:00:00.000Z"),
      recurrenceRule: null,
      recurrenceFrequency: RecurrenceFrequency.WEEKLY,
      recurrenceInterval: 1,
      recurrenceDays: [1, 3, 5],
      recurrenceEndAt: new Date("2026-05-01T08:00:00.000Z"),
      status: ReminderStatus.ACTIVE,
      completedAt: null,
      snoozedUntil: null,
      createdAt: new Date("2026-04-01T07:00:00.000Z"),
      updatedAt: new Date("2026-04-01T07:00:00.000Z"),
    });

    expect(label).toContain("Every weekly");
    expect(label).toContain("1, 3, 5");
  });

  it("computes countdown days deterministically", () => {
    expect(
      getCountdownDays(
        new Date("2026-04-12T00:00:00.000Z"),
        new Date("2026-04-05T12:00:00.000Z"),
      ),
    ).toBe(7);
  });
});
