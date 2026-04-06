import { Reminder, RecurrenceFrequency } from "@prisma/client";
import { addRecurrence, formatDateLabel } from "@/lib/datetime";

export function serializeRecurrence(reminder: {
  recurrenceFrequency: RecurrenceFrequency | null;
  recurrenceInterval: number | null;
  recurrenceDays: number[];
  recurrenceEndAt: Date | null;
}) {
  if (!reminder.recurrenceFrequency || !reminder.recurrenceInterval) {
    return null;
  }

  return JSON.stringify({
    frequency: reminder.recurrenceFrequency,
    interval: reminder.recurrenceInterval,
    daysOfWeek: reminder.recurrenceDays,
    endAt: reminder.recurrenceEndAt?.toISOString() ?? null,
  });
}

export function getReminderRecurrenceLabel(reminder: Reminder) {
  if (!reminder.recurrenceFrequency || !reminder.recurrenceInterval) {
    return null;
  }

  const intervalLabel = reminder.recurrenceInterval === 1 ? "Every" : `Every ${reminder.recurrenceInterval}`;
  const baseLabel = `${intervalLabel} ${reminder.recurrenceFrequency.toLowerCase()}`;
  const weekdayLabel = reminder.recurrenceDays.length
    ? ` on ${reminder.recurrenceDays.join(", ")}`
    : "";
  const endLabel = reminder.recurrenceEndAt ? ` until ${formatDateLabel(reminder.recurrenceEndAt)}` : "";

  return `${baseLabel}${weekdayLabel}${endLabel}`;
}

export function getNextRecurringDueAt(reminder: Reminder, fromDate: Date = new Date()) {
  if (!reminder.dueAt || !reminder.recurrenceFrequency || !reminder.recurrenceInterval) {
    return reminder.dueAt;
  }

  let candidate = reminder.dueAt;

  while (candidate < fromDate) {
    candidate = addRecurrence(candidate, reminder.recurrenceFrequency, reminder.recurrenceInterval);

    if (reminder.recurrenceEndAt && candidate > reminder.recurrenceEndAt) {
      return null;
    }
  }

  return candidate;
}
