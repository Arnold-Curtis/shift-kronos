import { getWeekRange } from "@/lib/datetime";
import { getReminderCollections } from "@/lib/reminders/service";
import { getTimetableCollections } from "@/lib/timetable/service";

export type AgendaItem = {
  kind: "reminder" | "class";
  id: string;
  title: string;
  startsAt: Date | null;
  detail: string | null;
};

export type InboxItem = {
  id: string;
  title: string;
  description: string | null;
};

export type FocusReminder = {
  id: string;
  title: string;
  dueAt: Date | null;
  description: string | null;
};

export async function getDashboardData(userId: string, now: Date = new Date()) {
  const [reminders, timetable] = await Promise.all([
    getReminderCollections(userId),
    getTimetableCollections(userId, now),
  ]);

  const weekRange = getWeekRange(now);

  const todayAgenda: AgendaItem[] = [
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
    if (!left.startsAt || !right.startsAt) return 0;
    return left.startsAt.getTime() - right.startsAt.getTime();
  });

  const weekAhead: AgendaItem[] = [
    ...reminders.scheduled
      .filter((r) => r.dueAt !== null)
      .map((reminder) => ({
        kind: "reminder" as const,
        id: reminder.id,
        title: reminder.title,
        startsAt: reminder.dueAt,
        detail: reminder.description,
      })),
    ...timetable.upcoming.map((entry) => ({
      kind: "class" as const,
      id: entry.entryId,
      title: entry.subject,
      startsAt: entry.startsAt,
      detail: entry.location,
    })),
  ].sort((left, right) => {
    if (!left.startsAt || !right.startsAt) return 0;
    return left.startsAt.getTime() - right.startsAt.getTime();
  });

  const inbox: InboxItem[] = reminders.inbox.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
  }));

  const highPriority: FocusReminder[] = reminders.highPriority.map((r) => ({
    id: r.id,
    title: r.title,
    dueAt: r.dueAt,
    description: r.description,
  }));

  return { todayAgenda, weekAhead, inbox, highPriority };
}
