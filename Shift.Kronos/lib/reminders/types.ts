import { ReminderPriority, ReminderStatus, ReminderType, RecurrenceFrequency } from "@prisma/client";

export type ReminderRecurrence = {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek: number[];
  endAt?: Date;
};

export type ReminderFormValues = {
  title: string;
  description?: string;
  type: ReminderType;
  priority: ReminderPriority;
  category?: string;
  tags: string[];
  dueAt?: Date;
  recurrence?: ReminderRecurrence;
};

export type ReminderBucket = "inbox" | "scheduled" | "highPriority" | "completed" | "countdown";

export type ReminderViewModel = {
  id: string;
  title: string;
  description: string | null;
  type: ReminderType;
  priority: ReminderPriority;
  category: string | null;
  tags: string[];
  status: ReminderStatus;
  dueAt: Date | null;
  completedAt: Date | null;
  countdownDays: number | null;
  recurrenceLabel: string | null;
};
