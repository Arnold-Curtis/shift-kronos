import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/reminders/service", () => ({
  getReminderCollections: vi.fn(async () => ({
    inbox: [
      {
        id: "rem_inbox",
        title: "Sort receipts",
        description: null,
        type: "INBOX",
        priority: "MEDIUM",
        category: null,
        tags: [],
        status: "ACTIVE",
        dueAt: null,
        completedAt: null,
        countdownDays: null,
        recurrenceLabel: null,
      },
    ],
    scheduled: [
      {
        id: "rem_sched",
        title: "Call supervisor",
        description: null,
        type: "ONE_TIME",
        priority: "HIGH",
        category: "admin",
        tags: [],
        status: "ACTIVE",
        dueAt: new Date("2026-04-05T15:00:00.000Z"),
        completedAt: null,
        countdownDays: null,
        recurrenceLabel: null,
      },
    ],
    countdowns: [],
    highPriority: [
      {
        id: "rem_sched",
        title: "Call supervisor",
        description: null,
        type: "ONE_TIME",
        priority: "HIGH",
        category: "admin",
        tags: [],
        status: "ACTIVE",
        dueAt: new Date("2026-04-05T15:00:00.000Z"),
        completedAt: null,
        countdownDays: null,
        recurrenceLabel: null,
      },
    ],
    completed: [],
    today: [
      {
        id: "rem_sched",
        title: "Call supervisor",
        description: null,
        type: "ONE_TIME",
        priority: "HIGH",
        category: "admin",
        tags: [],
        status: "ACTIVE",
        dueAt: new Date("2026-04-05T15:00:00.000Z"),
        completedAt: null,
        countdownDays: null,
        recurrenceLabel: null,
      },
    ],
  })),
}));

vi.mock("@/lib/timetable/service", () => ({
  getTimetableCollections: vi.fn(async () => ({
    entries: [],
    weekly: [
      {
        entryId: "class_1",
        subject: "Operating Systems",
        location: "Hall A",
        lecturer: null,
        startsAt: new Date("2026-04-05T09:00:00.000Z"),
        endsAt: new Date("2026-04-05T11:00:00.000Z"),
        reminderLeadMinutes: 30,
      },
    ],
    upcoming: [
      {
        entryId: "class_1",
        subject: "Operating Systems",
        location: "Hall A",
        lecturer: null,
        startsAt: new Date("2026-04-05T09:00:00.000Z"),
        endsAt: new Date("2026-04-05T11:00:00.000Z"),
        reminderLeadMinutes: 30,
      },
    ],
  })),
}));

import { getDashboardData } from "@/lib/dashboard/queries";

describe("dashboard queries", () => {
  it("combines reminders and timetable occurrences into live dashboard sections", async () => {
    const data = await getDashboardData("user_1", new Date("2026-04-05T08:00:00.000Z"));

    expect(data.inbox).toHaveLength(1);
    expect(data.highPriority).toHaveLength(1);
    expect(data.todayAgenda).toHaveLength(2);
    expect(data.weekAhead).toHaveLength(2);
  });
});
