import { ReminderPriority, ReminderType, RecurrenceFrequency } from "@prisma/client";
import { z } from "zod";
import { ASSISTANT_ACTION_TYPE } from "@/lib/assistant/types";

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

export const assistantParseResultSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(ASSISTANT_ACTION_TYPE.CREATE_REMINDER),
    confidence: z.enum(["high", "medium"]),
    reminder: reminderDraftSchema,
  }),
  z.object({
    type: z.literal(ASSISTANT_ACTION_TYPE.ANSWER_QUESTION),
    answer: z.object({
      summary: z.string().trim().min(1).max(2000),
      evidence: z.array(z.string().trim().min(1).max(240)).max(8),
    }),
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
});

export const assistantQuickCaptureSchema = z.object({
  input: z.string().trim().min(1).max(1000),
});

export function buildAssistantFallbackReminder(input: string) {
  return {
    title: input.trim().slice(0, 160),
    type: ReminderType.INBOX,
    priority: ReminderPriority.MEDIUM,
    tags: [],
  };
}
