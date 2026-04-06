import { ReminderPriority, ReminderType } from "@prisma/client";
import { formatISO } from "date-fns";
import { NOTIFICATION_SOURCE } from "@/lib/notifications/types";

function compactIso(value: Date) {
  return formatISO(value, { representation: "complete" });
}

export function createReminderOccurrenceKey(reminderId: string, effectiveDueAt: Date) {
  return `${reminderId}:${compactIso(effectiveDueAt)}`;
}

export function createTimetableOccurrenceKey(timetableEntryId: string, startsAt: Date) {
  return `${timetableEntryId}:${compactIso(startsAt)}`;
}

export function createReminderDedupeKey(reminderId: string, effectiveDueAt: Date) {
  return `${NOTIFICATION_SOURCE.REMINDER}:${createReminderOccurrenceKey(reminderId, effectiveDueAt)}`;
}

export function createTimetableDedupeKey(timetableEntryId: string, startsAt: Date, leadMinutes: number) {
  return `${NOTIFICATION_SOURCE.TIMETABLE}:${createTimetableOccurrenceKey(timetableEntryId, startsAt)}:${leadMinutes}`;
}

export function describeReminderMetadata(type: ReminderType, priority: ReminderPriority, category: string | null) {
  const details = [type.replaceAll("_", " ").toLowerCase(), priority.toLowerCase() + " priority"];

  if (category) {
    details.push(category);
  }

  return details.join(" | ");
}
