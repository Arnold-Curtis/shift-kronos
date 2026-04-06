import { ReminderPriority, ReminderType, RecurrenceFrequency } from "@prisma/client";
import { z } from "zod";

const prioritySchema = z.nativeEnum(ReminderPriority);
const reminderTypeSchema = z.nativeEnum(ReminderType);
const recurrenceFrequencySchema = z.nativeEnum(RecurrenceFrequency);

const isoDateSchema = z.coerce.date();

export const recurrenceSchema = z
  .object({
    frequency: recurrenceFrequencySchema,
    interval: z.number().int().min(1).max(365),
    daysOfWeek: z.array(z.number().int().min(1).max(7)).default([]),
    endAt: isoDateSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.frequency === RecurrenceFrequency.WEEKLY && value.daysOfWeek.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Weekly recurrence requires at least one selected weekday.",
        path: ["daysOfWeek"],
      });
    }

    if (value.frequency !== RecurrenceFrequency.WEEKLY && value.daysOfWeek.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only weekly recurrence can include selected weekdays.",
        path: ["daysOfWeek"],
      });
    }
  });

const baseReminderSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  type: reminderTypeSchema,
  priority: prioritySchema.default(ReminderPriority.MEDIUM),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  dueAt: isoDateSchema.optional(),
  recurrence: recurrenceSchema.optional(),
});

function validateReminderInput(
  value: z.infer<typeof baseReminderSchema>,
  context: z.RefinementCtx,
) {
  const needsDueAt = value.type === ReminderType.ONE_TIME || value.type === ReminderType.COUNTDOWN;
  const needsRecurrence = value.type === ReminderType.RECURRING || value.type === ReminderType.HABIT;
  const isInbox = value.type === ReminderType.INBOX;

  if (needsDueAt && !value.dueAt) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "This reminder type requires a scheduled date and time.",
      path: ["dueAt"],
    });
  }

  if (needsRecurrence && !value.recurrence) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Recurring reminders and habits require recurrence settings.",
      path: ["recurrence"],
    });
  }

  if (isInbox && value.dueAt) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Inbox items should remain unscheduled until they are planned.",
      path: ["dueAt"],
    });
  }

  if ((value.type === ReminderType.ONE_TIME || value.type === ReminderType.COUNTDOWN || value.type === ReminderType.INBOX) && value.recurrence) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "This reminder type cannot store recurrence settings.",
      path: ["recurrence"],
    });
  }
}

export const createReminderSchema = baseReminderSchema.superRefine(validateReminderInput);

export const updateReminderSchema = baseReminderSchema
  .partial()
  .extend({
    id: z.string().min(1),
  })
  .superRefine((value, context) => {
    if (!value.type) {
      return;
    }

    validateReminderInput(value as z.infer<typeof baseReminderSchema>, context);
  });

export const reminderStatusUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
export type ReminderStatusUpdateInput = z.infer<typeof reminderStatusUpdateSchema>;
