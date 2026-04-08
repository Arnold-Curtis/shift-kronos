import { db } from "@/lib/db";
import { addDays } from "date-fns";
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

export function getImportedSemesterRange(entries: TimetableImportInput["entries"]) {
  return entries.reduce(
    (range, entry) => ({
      start: entry.semesterStart < range.start ? entry.semesterStart : range.start,
      end: entry.semesterEnd > range.end ? entry.semesterEnd : range.end,
    }),
    {
      start: entries[0].semesterStart,
      end: entries[0].semesterEnd,
    },
  );
}

export type TimetableImportMode = "append" | "replace-semester";

export type TimetableImportResult = {
  importedCount: number;
  replacedCount: number;
  mode: TimetableImportMode;
};

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

export async function importTimetableEntries(
  userId: string,
  input: TimetableImportInput,
  options: { mode?: TimetableImportMode } = {},
): Promise<TimetableImportResult> {
  const values = timetableImportSchema.parse(input);
  const mode = options.mode ?? "append";

  const semesterRange = getImportedSemesterRange(values.entries);

  return db.$transaction(async (tx) => {
    let replacedCount = 0;

    if (mode === "replace-semester") {
      const deleted = await tx.timetableEntry.deleteMany({
        where: {
          userId,
          semesterStart: {
            lte: semesterRange.end,
          },
          semesterEnd: {
            gte: semesterRange.start,
          },
        },
      });

      replacedCount = deleted.count;
    }

    await Promise.all(
      values.entries.map((entry) =>
        tx.timetableEntry.create({
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

    return {
      importedCount: values.entries.length,
      replacedCount,
      mode,
    };
  });
}

export async function getTimetableOccurrencesInRange(userId: string, range: { start: Date; end: Date }) {
  const entries = await db.timetableEntry.findMany({
    where: {
      userId,
      semesterStart: {
        lte: range.end,
      },
      semesterEnd: {
        gte: range.start,
      },
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

  return entries.flatMap((entry) => getOccurrencesForEntry(entry, range));
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

  const nextSevenDays = await getTimetableOccurrencesInRange(userId, {
    start: now,
    end: addDays(now, 7),
  });

  const upcomingWindow = nextSevenDays
    .filter((occurrence) => occurrence.startsAt >= now)
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());

  return {
    entries,
    weekly: occurrences,
    upcoming: upcomingWindow.length > 0 ? upcomingWindow : upcoming,
  };
}

export async function updateTimetableEntry(
  userId: string,
  entryId: string,
  updates: {
    subject?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    lecturer?: string;
  },
) {
  const existing = await db.timetableEntry.findFirst({
    where: {
      id: entryId,
      userId,
    },
  });

  if (!existing) {
    throw new Error("Timetable entry not found.");
  }

  return db.timetableEntry.update({
    where: {
      id: entryId,
    },
    data: {
      subject: updates.subject ?? existing.subject,
      startTime: updates.startTime ?? existing.startTime,
      endTime: updates.endTime ?? existing.endTime,
      location: updates.location !== undefined ? updates.location : existing.location,
      lecturer: updates.lecturer !== undefined ? updates.lecturer : existing.lecturer,
    },
  });
}

export async function deleteTimetableEntry(userId: string, entryId: string) {
  const existing = await db.timetableEntry.findFirst({
    where: {
      id: entryId,
      userId,
    },
  });

  if (!existing) {
    throw new Error("Timetable entry not found.");
  }

  return db.timetableEntry.delete({
    where: {
      id: entryId,
    },
  });
}
