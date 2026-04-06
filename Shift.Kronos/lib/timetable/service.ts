import { db } from "@/lib/db";
import { getWeekRange } from "@/lib/datetime";
import { getOccurrencesForEntry } from "@/lib/timetable/occurrences";
import {
  TimetableEntryInput,
  TimetableImportInput,
  timetableEntrySchema,
  timetableImportSchema,
} from "@/lib/timetable/schemas";

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function createTimetableEntry(userId: string, input: TimetableEntryInput) {
  const values = timetableEntrySchema.parse(input);

  return db.timetableEntry.create({
    data: {
      userId,
      subject: values.subject.trim(),
      location: normalizeOptionalText(values.location),
      lecturer: normalizeOptionalText(values.lecturer),
      dayOfWeek: values.dayOfWeek,
      startTime: values.startTime,
      endTime: values.endTime,
      semesterStart: values.semesterStart,
      semesterEnd: values.semesterEnd,
      reminderLeadMinutes: values.reminderLeadMinutes,
    },
  });
}

export async function importTimetableEntries(userId: string, input: TimetableImportInput) {
  const values = timetableImportSchema.parse(input);

  return db.$transaction(
    values.entries.map((entry) =>
      db.timetableEntry.create({
        data: {
          userId,
          subject: entry.subject.trim(),
          location: normalizeOptionalText(entry.location),
          lecturer: normalizeOptionalText(entry.lecturer),
          dayOfWeek: entry.dayOfWeek,
          startTime: entry.startTime,
          endTime: entry.endTime,
          semesterStart: entry.semesterStart,
          semesterEnd: entry.semesterEnd,
          reminderLeadMinutes: entry.reminderLeadMinutes,
        },
      }),
    ),
  );
}

export async function getTimetableCollections(userId: string, now: Date = new Date()) {
  const range = getWeekRange(now);
  const entries = await db.timetableEntry.findMany({
    where: {
      userId,
    },
    orderBy: [
      {
        dayOfWeek: "asc",
      },
      {
        startTime: "asc",
      },
    ],
  });

  const occurrences = entries.flatMap((entry) => getOccurrencesForEntry(entry, range));
  const upcoming = occurrences
    .filter((occurrence) => occurrence.startsAt >= now)
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());

  return {
    entries,
    weekly: occurrences,
    upcoming,
  };
}
