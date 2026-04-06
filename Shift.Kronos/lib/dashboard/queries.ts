import { getWeekRange } from "@/lib/datetime";
import { getReminderCollections } from "@/lib/reminders/service";
import { getTimetableCollections } from "@/lib/timetable/service";

export async function getDashboardData(userId: string, now: Date = new Date()) {
  const [reminders, timetable] = await Promise.all([
    getReminderCollections(userId),
    getTimetableCollections(userId, now),
  ]);

  const weekRange = getWeekRange(now);

  return {
    inbox: reminders.inbox,
    highPriority: reminders.highPriority,
    todayAgenda: [
      ...reminders.today.map((reminder) => ({
        kind: "reminder" as const,
        id: reminder.id,
        title: reminder.title,
        startsAt: reminder.dueAt,
        detail: reminder.category,
      })),
      ...timetable.weekly
        .filter((entry) => entry.startsAt >= weekRange.start && entry.startsAt <= weekRange.end)
        .map((entry) => ({
          kind: "class" as const,
          id: entry.entryId,
          title: entry.subject,
          startsAt: entry.startsAt,
          detail: entry.location,
        })),
    ].sort((left, right) => {
      if (!left.startsAt || !right.startsAt) {
        return 0;
      }

      return left.startsAt.getTime() - right.startsAt.getTime();
    }),
    weekAhead: [
      ...reminders.scheduled
        .filter((reminder) => reminder.dueAt !== null)
        .map((reminder) => ({
          kind: "reminder" as const,
          id: reminder.id,
          title: reminder.title,
          dueAt: reminder.dueAt,
          priority: reminder.priority,
          description: reminder.description,
        })),
      ...timetable.upcoming.map((entry) => ({
        kind: "class" as const,
        entryId: entry.entryId,
        subject: entry.subject,
        startsAt: entry.startsAt,
        location: entry.location,
      })),
    ],
  };
}
