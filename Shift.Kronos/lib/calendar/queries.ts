import { getReminderCollections } from "@/lib/reminders/service";
import { getTimetableCollections } from "@/lib/timetable/service";

export type CalendarEvent = {
  id: string;
  kind: "reminder" | "class";
  title: string;
  startsAt: Date;
  endsAt?: Date;
  detail: string | null;
  priority?: string;
  status?: string;
};

export async function getCalendarEvents(
  userId: string,
  now: Date = new Date(),
): Promise<CalendarEvent[]> {
  const [reminders, timetable] = await Promise.all([
    getReminderCollections(userId),
    getTimetableCollections(userId, now),
  ]);

  const reminderEvents: CalendarEvent[] = [
    ...reminders.scheduled,
    ...reminders.today,
    ...reminders.countdowns,
  ]
    .filter((r) => r.dueAt !== null)
    .map((r) => ({
      id: r.id,
      kind: "reminder" as const,
      title: r.title,
      startsAt: r.dueAt!,
      detail: r.description ?? r.category,
      priority: r.priority,
      status: r.status,
    }));

  const timetableEvents: CalendarEvent[] = [
    ...timetable.weekly,
    ...timetable.upcoming,
  ].map((entry) => ({
    id: `tt-${entry.entryId}-${entry.startsAt.toISOString()}`,
    kind: "class" as const,
    title: entry.subject,
    startsAt: entry.startsAt,
    endsAt: entry.endsAt,
    detail: entry.location,
  }));

  return [...reminderEvents, ...timetableEvents].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  );
}
