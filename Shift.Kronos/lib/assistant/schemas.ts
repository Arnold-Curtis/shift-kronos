import { ReminderPriority, ReminderType, RecurrenceFrequency } from "@prisma/client";
import { z } from "zod";
import { ASSISTANT_ACTION_TYPE } from "@/lib/assistant/types";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/);

const reminderDraftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  type: z.nativeEnum(ReminderType),
  priority: z.nativeEnum(ReminderPriority),
  category: z.string().trim().max(80).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12),
  dueAt: z.coerce.date().optional(),
  recurrence: z
    .object({
      frequency: z.nativeEnum(RecurrenceFrequency),
      interval: z.number().int().min(1).max(365),
      daysOfWeek: z.array(z.number().int().min(1).max(7)).default([]),
      endAt: z.coerce.date().optional(),
    })
    .optional(),
});

const noteDraftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  content: z.string().trim().min(1).max(4000),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
});

const timetableDraftSchema = z.object({
  subject: z.string().trim().min(1).max(160),
  location: z.string().trim().max(160).optional(),
  lecturer: z.string().trim().max(160).optional(),
  dayOfWeek: z.number().int().min(1).max(7).optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  semesterStart: z.coerce.date().optional(),
  semesterEnd: z.coerce.date().optional(),
  reminderLeadMinutes: z.number().int().min(0).max(1440).optional(),
});

const reminderUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  priority: z.nativeEnum(ReminderPriority).optional(),
  dueAt: z.coerce.date().optional(),
});

const noteUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  content: z.string().trim().min(1).max(4000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
});

const timetableUpdateSchema = z.object({
  subject: z.string().trim().min(1).max(160).optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  location: z.string().trim().max(160).optional(),
  lecturer: z.string().trim().max(160).optional(),
});

const answerSchema = z.object({
  summary: z.string().trim().min(1).max(2000),
  evidence: z.array(z.string().trim().min(1).max(240)).max(8),
  sources: z
    .array(
      z.object({
        type: z.string().trim().min(1).max(80),
        id: z.string().trim().min(1).max(191),
        title: z.string().trim().min(1).max(240),
      }),
    )
    .max(8)
    .optional(),
});

const timeContextSchema = z.object({
  date: z.coerce.date().optional(),
  dayOfWeek: z.number().int().min(1).max(7).optional(),
  timeRange: z
    .object({
      start: timeSchema,
      end: timeSchema,
    })
    .optional(),
});

export const assistantParseResultSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(ASSISTANT_ACTION_TYPE.CREATE_REMINDER),
    confidence: z.enum(["high", "medium"]),
    reminder: reminderDraftSchema,
  }),
  z.object({
    type: z.literal(ASSISTANT_ACTION_TYPE.UPDATE_REMINDER),
    confidence: z.enum(["high", "medium", "low"]),
    reminderId: z.string().trim().min(1).max(191),
    updates: reminderUpdateSchema,
  }),
  z.object({
    type: z.literal(ASSISTANT_ACTION_TYPE.CREATE_NOTE),
    confidence: z.enum(["high", "medium", "low"]),
    note: noteDraftSchema,
    alsoCreateMemory: z.boolean().default(true),
  }),
  z.object({
    type: z.literal(ASSISTANT_ACTION_TYPE.UPDATE_NOTE),
    confidence: z.enum(["high", "medium", "low"]),
    noteId: z.string().trim().min(1).max(191),
    updates: noteUpdateSchema,
  }),
  z.object({
    type: z.literal(ASSISTANT_ACTION_TYPE.CREATE_TIMETABLE_ENTRY),
    confidence: z.enum(["high", "medium", "low"]),
    timetableEntry: timetableDraftSchema,
  }),
  z.object({
    type: z.literal(ASSISTANT_ACTION_TYPE.UPDATE_TIMETABLE_ENTRY),
    confidence: z.enum(["high", "medium", "low"]),
    entryId: z.string().trim().min(1).max(191),
    updates: timetableUpdateSchema,
  }),
  z.object({
    type: z.literal(ASSISTANT_ACTION_TYPE.DELETE_ENTITY),
    confidence: z.enum(["high", "medium", "low"]),
    entityType: z.enum(["REMINDER", "NOTE", "TIMETABLE_ENTRY", "CONVERSATION"]),
    entityId: z.string().trim().min(1).max(191),
    requiresConfirmation: z.boolean().default(true),
  }),
  z.object({
    type: z.literal(ASSISTANT_ACTION_TYPE.SEARCH_MEMORY),
    query: z.string().trim().min(1).max(400),
    target: z.enum(["SCHEDULE", "MEMORY", "REMINDERS", "NOTES", "ALL"]),
    timeContext: timeContextSchema.optional(),
    answer: answerSchema.optional(),
  }),
  z.object({
    type: z.literal(ASSISTANT_ACTION_TYPE.DISAMBIGUATE),
    options: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(80),
          description: z.string().trim().min(1).max(240),
          action: z.unknown(),
        }),
      )
      .min(1)
      .max(6),
    defaultOption: z.number().int().min(0).max(5),
  }),
  z.object({
    type: z.literal(ASSISTANT_ACTION_TYPE.ANSWER_QUESTION),
    answer: answerSchema,
  }),
  z.object({
    type: z.literal(ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS),
    clarification: z.object({
      missingFields: z.array(z.string().trim().min(1).max(80)).min(1).max(6),
      question: z.string().trim().min(1).max(300),
    }),
  }),
  z.object({
    type: z.literal(ASSISTANT_ACTION_TYPE.REJECT_REQUEST),
    reason: z.string().trim().min(1).max(300),
  }),
]);

export const assistantChatInputSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationId: z.string().trim().min(1).optional(),
});

export const assistantVoiceInputSchema = z.object({
  transcript: z.string().trim().min(1).max(8000),
  conversationId: z.string().trim().min(1).optional(),
});

export const assistantQuickCaptureSchema = z.object({
  input: z.string().trim().min(1).max(1000),
  conversationId: z.string().trim().min(1).optional(),
});

export function buildAssistantFallbackReminder(input: string) {
  return {
    title: input.trim().slice(0, 160),
    type: ReminderType.INBOX,
    priority: ReminderPriority.MEDIUM,
    tags: [],
  };
}
