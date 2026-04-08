import { TimetableEntry } from "@prisma/client";
import { addDays, eachDayOfInterval, isWithinInterval, startOfDay } from "date-fns";
import { combineDateAndTime, getWeekdayFromDate } from "@/lib/datetime";
import { TimetableOccurrence } from "@/lib/timetable/types";

export function getOccurrencesForEntry(entry: TimetableEntry, range: { start: Date; end: Date }) {
  const timeZone = "Africa/Nairobi";
  const days = eachDayOfInterval({
    start: startOfDay(range.start),
    end: startOfDay(range.end),
  });

  return days
    .filter((day) => {
      if (day < startOfDay(entry.semesterStart) || day > startOfDay(entry.semesterEnd)) {
        return false;
      }

      return getWeekdayFromDate(day, timeZone) === entry.dayOfWeek;
    })
    .map<TimetableOccurrence>((day) => ({
      entryId: entry.id,
      subject: entry.subject,
      location: entry.location,
      lecturer: entry.lecturer,
      startsAt: combineDateAndTime(day, entry.startTime, timeZone),
      endsAt: combineDateAndTime(day, entry.endTime, timeZone),
      reminderLeadMinutes: entry.reminderLeadMinutes,
    }))
    .filter((occurrence) =>
      isWithinInterval(occurrence.startsAt, {
        start: range.start,
        end: range.end,
      }),
    );
}

export function getWeeklyColumns(rangeStart: Date) {
  return Array.from({ length: 7 }, (_, index) => addDays(startOfDay(rangeStart), index));
}
