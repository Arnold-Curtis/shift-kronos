import {
  Reminder,
  ReminderPriority,
  ReminderStatus,
  ReminderType,
  RecurrenceFrequency,
} from "@prisma/client";
import { db } from "@/lib/db";
import { getCountdownDays, startOfTodayRange } from "@/lib/datetime";
import {
  CreateReminderInput,
  ReminderStatusUpdateInput,
  UpdateReminderInput,
  createReminderSchema,
  reminderStatusUpdateSchema,
  updateReminderSchema,
} from "@/lib/reminders/schemas";
import { getReminderRecurrenceLabel, getNextRecurringDueAt, serializeRecurrence } from "@/lib/reminders/recurrence";
import { ReminderViewModel } from "@/lib/reminders/types";

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

type ReminderRecord = Pick<
  Reminder,
  | "id"
  | "title"
  | "description"
  | "type"
  | "priority"
  | "category"
  | "tags"
  | "status"
  | "dueAt"
  | "completedAt"
  | "recurrenceFrequency"
  | "recurrenceInterval"
  | "recurrenceDays"
  | "recurrenceEndAt"
> & {
  recurrenceFrequency: RecurrenceFrequency | null;
};

function mapReminderViewModel(reminder: ReminderRecord): ReminderViewModel {
  const effectiveDueAt = reminder.type === ReminderType.RECURRING || reminder.type === ReminderType.HABIT
    ? getNextRecurringDueAt(reminder as Reminder)
    : reminder.dueAt;

  return {
    id: reminder.id,
    title: reminder.title,
    description: reminder.description,
    type: reminder.type,
    priority: reminder.priority,
    category: reminder.category,
    tags: reminder.tags,
    status: reminder.status,
    dueAt: effectiveDueAt,
    completedAt: reminder.completedAt,
    countdownDays:
      reminder.type === ReminderType.COUNTDOWN && effectiveDueAt
        ? getCountdownDays(effectiveDueAt)
        : null,
    recurrenceLabel: getReminderRecurrenceLabel(reminder as Reminder),
  };
}

export async function createReminder(userId: string, input: CreateReminderInput) {
  const values = createReminderSchema.parse(input);

  return db.reminder.create({
    data: {
      userId,
      title: values.title.trim(),
      description: normalizeOptionalText(values.description),
      type: values.type,
      priority: values.priority,
      category: normalizeOptionalText(values.category),
      tags: values.tags,
      dueAt: values.dueAt,
      recurrenceRule: values.recurrence
        ? JSON.stringify({
            frequency: values.recurrence.frequency,
            interval: values.recurrence.interval,
            daysOfWeek: values.recurrence.daysOfWeek,
            endAt: values.recurrence.endAt?.toISOString() ?? null,
          })
        : null,
      recurrenceFrequency: values.recurrence?.frequency,
      recurrenceInterval: values.recurrence?.interval,
      recurrenceDays: values.recurrence?.daysOfWeek ?? [],
      recurrenceEndAt: values.recurrence?.endAt ?? null,
    },
  });
}

export async function updateReminder(userId: string, input: UpdateReminderInput) {
  const values = updateReminderSchema.parse(input);

  const existing = await db.reminder.findFirst({
    where: {
      id: values.id,
      userId,
    },
  });

  if (!existing) {
    throw new Error("Reminder not found.");
  }

  const merged = createReminderSchema.parse({
    title: values.title ?? existing.title,
    description: values.description ?? existing.description ?? undefined,
    type: values.type ?? existing.type,
    priority: values.priority ?? existing.priority,
    category: values.category ?? existing.category ?? undefined,
    tags: values.tags ?? existing.tags,
    dueAt: values.dueAt ?? existing.dueAt ?? undefined,
    recurrence:
      values.recurrence ??
      (existing.recurrenceFrequency && existing.recurrenceInterval
        ? {
            frequency: existing.recurrenceFrequency,
            interval: existing.recurrenceInterval,
            daysOfWeek: existing.recurrenceDays,
            endAt: existing.recurrenceEndAt ?? undefined,
          }
        : undefined),
  });

  return db.reminder.update({
    where: {
      id: existing.id,
    },
    data: {
      title: merged.title.trim(),
      description: normalizeOptionalText(merged.description),
      type: merged.type,
      priority: merged.priority,
      category: normalizeOptionalText(merged.category),
      tags: merged.tags,
      dueAt: merged.dueAt,
      recurrenceRule: merged.recurrence
        ? JSON.stringify({
            frequency: merged.recurrence.frequency,
            interval: merged.recurrence.interval,
            daysOfWeek: merged.recurrence.daysOfWeek,
            endAt: merged.recurrence.endAt?.toISOString() ?? null,
          })
        : null,
      recurrenceFrequency: merged.recurrence?.frequency ?? null,
      recurrenceInterval: merged.recurrence?.interval ?? null,
      recurrenceDays: merged.recurrence?.daysOfWeek ?? [],
      recurrenceEndAt: merged.recurrence?.endAt ?? null,
    },
  });
}

export async function updateReminderStatus(userId: string, input: ReminderStatusUpdateInput) {
  const values = reminderStatusUpdateSchema.parse(input);

  const existing = await db.reminder.findFirst({
    where: {
      id: values.id,
      userId,
    },
  });

  if (!existing) {
    throw new Error("Reminder not found.");
  }

  return db.reminder.update({
    where: {
      id: existing.id,
    },
    data: {
      status: values.status as ReminderStatus,
      completedAt: values.status === "COMPLETED" ? new Date() : null,
    },
  });
}

export async function getReminderCollections(userId: string) {
  const reminders = await db.reminder.findMany({
    where: {
      userId,
    },
    orderBy: [
      {
        priority: "desc",
      },
      {
        dueAt: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  const viewModels = reminders.map(mapReminderViewModel);
  const todayRange = startOfTodayRange();

  return {
    inbox: viewModels.filter((reminder) => reminder.type === ReminderType.INBOX && reminder.status === ReminderStatus.ACTIVE),
    scheduled: viewModels.filter(
      (reminder) =>
        reminder.status === ReminderStatus.ACTIVE &&
        reminder.type !== ReminderType.INBOX &&
        reminder.type !== ReminderType.COUNTDOWN,
    ),
    countdowns: viewModels.filter(
      (reminder) => reminder.type === ReminderType.COUNTDOWN && reminder.status === ReminderStatus.ACTIVE,
    ),
    highPriority: viewModels.filter(
      (reminder) => reminder.status === ReminderStatus.ACTIVE && reminder.priority === ReminderPriority.HIGH,
    ),
    completed: viewModels.filter((reminder) => reminder.status === ReminderStatus.COMPLETED),
    today: viewModels.filter(
      (reminder) =>
        reminder.status === ReminderStatus.ACTIVE &&
        reminder.dueAt !== null &&
        reminder.dueAt >= todayRange.start &&
        reminder.dueAt <= todayRange.end,
    ),
  };
}

export function getReminderRecurrencePayload(input: CreateReminderInput | UpdateReminderInput) {
  if (!input.recurrence) {
    return {
      recurrenceRule: null,
      recurrenceFrequency: null,
      recurrenceInterval: null,
      recurrenceDays: [],
      recurrenceEndAt: null,
    };
  }

  return {
    recurrenceRule: serializeRecurrence({
      recurrenceFrequency: input.recurrence.frequency,
      recurrenceInterval: input.recurrence.interval,
      recurrenceDays: input.recurrence.daysOfWeek,
      recurrenceEndAt: input.recurrence.endAt ?? null,
    }),
    recurrenceFrequency: input.recurrence.frequency,
    recurrenceInterval: input.recurrence.interval,
    recurrenceDays: input.recurrence.daysOfWeek,
    recurrenceEndAt: input.recurrence.endAt ?? null,
  };
}
