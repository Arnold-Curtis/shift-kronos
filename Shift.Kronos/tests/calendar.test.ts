import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/reminders/service", () => ({
  getReminderCollections: vi.fn(async () => ({
    inbox: [],
    scheduled: [],
    countdowns: [],
    highPriority: [],
    completed: [],
    today: [],
  })),
}));

vi.mock("@/lib/timetable/service", () => ({
  getTimetableOccurrencesInRange: vi.fn(async () => [
    {
      entryId: "class_1",
      subject: "Operating Systems",
      location: "Hall A",
      lecturer: null,
      startsAt: new Date("2026-04-05T09:00:00.000Z"),
      endsAt: new Date("2026-04-05T11:00:00.000Z"),
      reminderLeadMinutes: 30,
    },
  ]),
}));

import { getCalendarEvents } from "@/lib/calendar/queries";

describe("calendar queries", () => {
  it("returns each timetable occurrence once", async () => {
    const events = await getCalendarEvents("user_1", new Date("2026-04-05T08:00:00.000Z"));

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "class",
      title: "Operating Systems",
    });
  });
});
