import { describe, expect, it } from "vitest";
import { getOccurrencesForEntry } from "@/lib/timetable/occurrences";
import { timetableEntrySchema, timetableImportSchema } from "@/lib/timetable/schemas";
import { getImportedSemesterRange } from "@/lib/timetable/service";

describe("timetable schemas", () => {
  it("accepts a valid timetable entry", () => {
    const result = timetableEntrySchema.parse({
      subject: "Software Engineering",
      dayOfWeek: 2,
      startTime: "10:00",
      endTime: "12:00",
      semesterStart: "2026-04-06",
      semesterEnd: "2026-07-31",
      reminderLeadMinutes: 30,
    });

    expect(result.subject).toBe("Software Engineering");
  });

  it("rejects invalid time ordering", () => {
    expect(() =>
      timetableEntrySchema.parse({
        subject: "Databases",
        dayOfWeek: 4,
        startTime: "14:00",
        endTime: "12:00",
        semesterStart: "2026-04-06",
        semesterEnd: "2026-07-31",
        reminderLeadMinutes: 30,
      }),
    ).toThrow(/earlier than end time/);
  });

  it("validates strict import payload shape", () => {
    const result = timetableImportSchema.parse({
      entries: [
        {
          subject: "Computer Networks",
          dayOfWeek: 5,
          startTime: "08:00",
          endTime: "10:00",
          semesterStart: "2026-04-06",
          semesterEnd: "2026-07-31",
          reminderLeadMinutes: 45,
        },
      ],
    });

    expect(result.entries).toHaveLength(1);
  });
});

describe("timetable occurrences", () => {
  it("expands a timetable entry into weekly occurrences within the requested range", () => {
    const occurrences = getOccurrencesForEntry(
      {
        id: "entry_1",
        userId: "user_1",
        subject: "Algorithms",
        location: "Lab 2",
        lecturer: "Dr. Ada",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "11:00",
        semesterStart: new Date("2026-04-06T00:00:00.000Z"),
        semesterEnd: new Date("2026-07-31T00:00:00.000Z"),
        reminderLeadMinutes: 30,
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        updatedAt: new Date("2026-04-01T00:00:00.000Z"),
      },
      {
        start: new Date("2026-04-06T00:00:00.000Z"),
        end: new Date("2026-04-12T23:59:59.000Z"),
      },
    );

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]?.startsAt.toISOString()).toBe("2026-04-06T06:00:00.000Z");
  });
});

describe("timetable import range", () => {
  it("computes the overlapping semester replacement window from imported entries", () => {
    const range = getImportedSemesterRange([
      {
        subject: "Algorithms",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "11:00",
        semesterStart: new Date("2026-04-06T00:00:00.000Z"),
        semesterEnd: new Date("2026-07-31T00:00:00.000Z"),
        reminderLeadMinutes: 30,
      },
      {
        subject: "Databases",
        dayOfWeek: 4,
        startTime: "13:00",
        endTime: "15:00",
        semesterStart: new Date("2026-04-01T00:00:00.000Z"),
        semesterEnd: new Date("2026-08-05T00:00:00.000Z"),
        reminderLeadMinutes: 20,
      },
    ]);

    expect(range.start.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-08-05T00:00:00.000Z");
  });
});
