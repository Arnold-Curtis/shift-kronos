import { db } from "@/lib/db";
import { addMonths, startOfMonth, endOfMonth } from "date-fns";

interface SemesterRange {
  semesterStart: Date;
  semesterEnd: Date;
}

export async function inferSemesterRange(
  userId: string,
  entryDate?: Date
): Promise<SemesterRange> {
  const existingEntries = await db.timetableEntry.findMany({
    where: { userId },
    select: {
      semesterStart: true,
      semesterEnd: true,
    },
    take: 1,
  });

  if (existingEntries.length > 0 && existingEntries[0].semesterStart && existingEntries[0].semesterEnd) {
    return {
      semesterStart: existingEntries[0].semesterStart,
      semesterEnd: existingEntries[0].semesterEnd,
    };
  }

  const now = entryDate || new Date();
  return {
    semesterStart: startOfMonth(now),
    semesterEnd: endOfMonth(addMonths(now, 4)),
  };
}

export async function findTimetableEntryByContext(
  userId: string,
  params: {
    dayOfWeek?: number;
    startTime?: string;
    subject?: string;
  }
) {
  const whereClause: Record<string, unknown> = { userId };

  if (params.dayOfWeek !== undefined) {
    whereClause.dayOfWeek = params.dayOfWeek;
  }

  if (params.startTime) {
    whereClause.startTime = params.startTime;
  }

  if (params.subject) {
    whereClause.subject = {
      contains: params.subject,
      mode: "insensitive",
    };
  }

  return db.timetableEntry.findFirst({
    where: whereClause,
  });
}
