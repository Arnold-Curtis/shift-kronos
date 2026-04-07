import { ConversationMessageRole } from "@prisma/client";
import { generateStructuredAssistantAction } from "@/lib/ai/providers/text";
import { transcribeAudioInput } from "@/lib/ai/providers/transcription";
import {
  resolveAssistantModel,
  resolveAssistantProvider,
  resolveTranscriptionModel,
  resolveTranscriptionProvider,
} from "@/lib/ai/preferences";
import { getAssistantContextForUser } from "@/lib/assistant/context";
import { appendConversationMessage, ensureConversation, getRecentConversationMessages } from "@/lib/assistant/conversations";
import { assistantParseResultSchema } from "@/lib/assistant/schemas";
import {
  ASSISTANT_ACTION_TYPE,
  ASSISTANT_INPUT_SOURCE,
  ASSISTANT_RESULT_KIND,
  AssistantAction,
  AssistantWorkflowInput,
  AssistantWorkflowResult,
} from "@/lib/assistant/types";
import { processConversationMemory } from "@/lib/memory/service";
import { createReminder } from "@/lib/reminders/service";
import { createTimetableEntry } from "@/lib/timetable/service";
import { db } from "@/lib/db";
import { formatDateLabel } from "@/lib/datetime";

function buildExecutedMessage(title: string, dueAt?: Date) {
  if (!dueAt) {
    return `Created reminder: ${title}.`;
  }

  return `Created reminder: ${title} for ${dueAt.toISOString()}.`;
}

function buildTimetableExecutedMessage(input: {
  subject: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  semesterStart: Date;
  semesterEnd: Date;
}) {
  const weekdayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return `Created timetable entry: ${input.subject} every ${weekdayLabels[input.dayOfWeek - 1] ?? "week"} from ${input.startTime} to ${input.endTime}, between ${formatDateLabel(input.semesterStart)} and ${formatDateLabel(input.semesterEnd)}.`;
}

function buildTimetableClarificationMessage(missingFields: string[]) {
  if (missingFields.includes("endTime")) {
    return "What time does this class end? Timetable entries need both a start time and an end time.";
  }

  if (missingFields.includes("dayOfWeek")) {
    return "Which day of the week should this class repeat on?";
  }

  if (missingFields.includes("semesterStart") || missingFields.includes("semesterEnd")) {
    return "What semester date range should I use for this recurring timetable entry?";
  }

  return "I need a few more timetable details before I can create that class entry.";
}

function buildAnswerMessage(summary: string, evidence: string[]) {
  return evidence.length > 0 ? `${summary}\n\n${evidence.join("\n")}` : summary;
}

export function buildFollowUpInput(input: string, recentConversation: Array<{ role: ConversationMessageRole; content: string }>) {
  const normalizedInput = input.trim();

  if (!normalizedInput) {
    return input;
  }

  const lastAssistantMessage = [...recentConversation]
    .reverse()
    .find((message) => message.role === ConversationMessageRole.ASSISTANT);

  const lastAssistantContent = lastAssistantMessage?.content.trim() ?? "";
  const looksLikeClarification =
    /[?]$/.test(lastAssistantContent) ||
    /^what\b/i.test(lastAssistantContent) ||
    /^which\b/i.test(lastAssistantContent) ||
    /^when\b/i.test(lastAssistantContent) ||
    /^do you want\b/i.test(lastAssistantContent) ||
    /need both a start time and an end time/i.test(lastAssistantContent) ||
    /need a few more/i.test(lastAssistantContent);

  if (!lastAssistantMessage || !looksLikeClarification) {
    return input;
  }

  const lastUserMessage = [...recentConversation]
    .reverse()
    .find((message) => message.role === ConversationMessageRole.USER);

  if (!lastUserMessage) {
    return input;
  }

  const lower = normalizedInput.toLowerCase();
  const isStandaloneIntent =
    lower.startsWith("remind me") ||
    lower.startsWith("add a reminder") ||
    lower.startsWith("set a reminder") ||
    lower.startsWith("set reminder") ||
    lower.startsWith("add reminder") ||
    lower.startsWith("create reminder") ||
    lower.startsWith("add a timetable entry") ||
    lower.startsWith("add timetable entry") ||
    lower.startsWith("add a class") ||
    lower.startsWith("add class") ||
    lower.startsWith("schedule a class") ||
    lower.startsWith("what ") ||
    lower.startsWith("do ") ||
    lower.startsWith("can ");

  if (isStandaloneIntent) {
    return input;
  }

  return `${lastUserMessage.content.trim()} ${normalizedInput}`;
}

function buildStructuredFollowUpInput(
  input: string,
  recentConversation: Array<{
    role: ConversationMessageRole;
    content: string;
    structuredData: unknown;
  }>,
) {
  const normalizedInput = input.trim();

  if (!normalizedInput) {
    return input;
  }

  const recent = [...recentConversation];
  const lastAssistantClarification = recent.find((message) => {
    if (message.role !== ConversationMessageRole.ASSISTANT || !message.structuredData || typeof message.structuredData !== "object") {
      return false;
    }

    const candidate = message.structuredData as Record<string, unknown>;
    return candidate.type === ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS;
  });

  if (!lastAssistantClarification) {
    return buildFollowUpInput(input, recentConversation.map((message) => ({ role: message.role, content: message.content })));
  }

  const clarification = (lastAssistantClarification.structuredData as Record<string, unknown>).clarification as Record<string, unknown> | undefined;
  const missingFields = Array.isArray(clarification?.missingFields)
    ? clarification.missingFields.map((item) => String(item))
    : [];

  const lastUserMessage = recent.find((message) => message.role === ConversationMessageRole.USER);

  if (!lastUserMessage) {
    return input;
  }

  const lower = normalizedInput.toLowerCase();
  const isStandaloneIntent =
    lower.startsWith("remind me") ||
    lower.startsWith("add a reminder") ||
    lower.startsWith("set a reminder") ||
    lower.startsWith("set reminder") ||
    lower.startsWith("add reminder") ||
    lower.startsWith("create reminder") ||
    lower.startsWith("add a timetable entry") ||
    lower.startsWith("add timetable entry") ||
    lower.startsWith("add a class") ||
    lower.startsWith("add class") ||
    lower.startsWith("schedule a class") ||
    lower.startsWith("what ") ||
    lower.startsWith("do ") ||
    lower.startsWith("can ");

  if (isStandaloneIntent) {
    return input;
  }

  if (missingFields.length === 0) {
    return `${lastUserMessage.content.trim()} ${normalizedInput}`;
  }

  return `${lastUserMessage.content.trim()} ${normalizedInput}`;
}

export async function runAssistantWorkflow(input: AssistantWorkflowInput): Promise<AssistantWorkflowResult> {
  const now = input.now ?? new Date();
  const user = await db.user.findUniqueOrThrow({
    where: {
      id: input.userId,
    },
    select: {
      assistantProvider: true,
      assistantModel: true,
    },
  });
  const conversation = await ensureConversation(input.userId, input.source, input.conversationId);
  const recentMessages = await getRecentConversationMessages(conversation.id, 12);
  const effectiveInput = buildStructuredFollowUpInput(input.input, recentMessages);
  const context = await getAssistantContextForUser(input.userId, now, effectiveInput, conversation.id);

  await appendConversationMessage(conversation.id, ConversationMessageRole.USER, input.input, {
    source: input.source,
    effectiveInput,
  });

  const action = assistantParseResultSchema.parse(
    await generateStructuredAssistantAction({
      userId: input.userId,
      input: effectiveInput,
      context,
      provider: resolveAssistantProvider(user),
      model: resolveAssistantModel(user),
    }),
  ) as AssistantAction;

  if (action.type === ASSISTANT_ACTION_TYPE.CREATE_REMINDER) {
    await createReminder(input.userId, action.reminder);

    const message = buildExecutedMessage(action.reminder.title, action.reminder.dueAt);
    await appendConversationMessage(conversation.id, ConversationMessageRole.ASSISTANT, message, action);
    await processConversationMemory(input.userId, conversation.id);

    return {
      kind: ASSISTANT_RESULT_KIND.EXECUTED,
      action,
      message,
      conversationId: conversation.id,
    };
  }

  if (action.type === ASSISTANT_ACTION_TYPE.CREATE_TIMETABLE_ENTRY) {
    const missingFields = [
      !action.timetableEntry.dayOfWeek ? "dayOfWeek" : null,
      !action.timetableEntry.startTime ? "startTime" : null,
      !action.timetableEntry.endTime ? "endTime" : null,
      !action.timetableEntry.semesterStart ? "semesterStart" : null,
      !action.timetableEntry.semesterEnd ? "semesterEnd" : null,
    ].filter((value): value is string => Boolean(value));

    if (missingFields.length > 0) {
      const clarificationAction: AssistantAction = {
        type: ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS,
        clarification: {
          missingFields,
          question: buildTimetableClarificationMessage(missingFields),
        },
      };

      await appendConversationMessage(
        conversation.id,
        ConversationMessageRole.ASSISTANT,
        clarificationAction.clarification.question,
        clarificationAction,
      );
      await processConversationMemory(input.userId, conversation.id);

      return {
        kind: ASSISTANT_RESULT_KIND.CLARIFICATION,
        action: clarificationAction,
        message: clarificationAction.clarification.question,
        conversationId: conversation.id,
      };
    }

    const entry = await createTimetableEntry(input.userId, {
      subject: action.timetableEntry.subject,
      location: action.timetableEntry.location ?? "",
      lecturer: action.timetableEntry.lecturer ?? "",
      dayOfWeek: action.timetableEntry.dayOfWeek as number,
      startTime: action.timetableEntry.startTime as string,
      endTime: action.timetableEntry.endTime as string,
      semesterStart: action.timetableEntry.semesterStart as Date,
      semesterEnd: action.timetableEntry.semesterEnd as Date,
      reminderLeadMinutes: action.timetableEntry.reminderLeadMinutes ?? 30,
    });

    const message = buildTimetableExecutedMessage({
      subject: entry.subject,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      semesterStart: entry.semesterStart,
      semesterEnd: entry.semesterEnd,
    });
    await appendConversationMessage(conversation.id, ConversationMessageRole.ASSISTANT, message, action);
    await processConversationMemory(input.userId, conversation.id);

    return {
      kind: ASSISTANT_RESULT_KIND.EXECUTED,
      action,
      message,
      conversationId: conversation.id,
    };
  }

  if (action.type === ASSISTANT_ACTION_TYPE.ANSWER_QUESTION) {
    const message = buildAnswerMessage(action.answer.summary, action.answer.evidence);
    await appendConversationMessage(conversation.id, ConversationMessageRole.ASSISTANT, message, action);
    await processConversationMemory(input.userId, conversation.id);

    return {
      kind: ASSISTANT_RESULT_KIND.ANSWERED,
      action,
      message,
      conversationId: conversation.id,
    };
  }

  if (action.type === ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS) {
    await appendConversationMessage(
      conversation.id,
      ConversationMessageRole.ASSISTANT,
      action.clarification.question,
      action,
    );
    await processConversationMemory(input.userId, conversation.id);

    return {
      kind: ASSISTANT_RESULT_KIND.CLARIFICATION,
      action,
      message: action.clarification.question,
      conversationId: conversation.id,
    };
  }

  await appendConversationMessage(conversation.id, ConversationMessageRole.ASSISTANT, action.reason, action);
  await processConversationMemory(input.userId, conversation.id);

  return {
    kind: ASSISTANT_RESULT_KIND.REJECTED,
    action,
    message: action.reason,
    conversationId: conversation.id,
  };
}

export async function runVoiceAssistantWorkflow(userId: string, input: { transcript?: string; audioFile?: File | null }) {
  const user = await db.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
    select: {
      transcriptionProvider: true,
      transcriptionModel: true,
    },
  });

  const transcription = await transcribeAudioInput({
    input:
      input.audioFile
        ? {
            kind: "file",
            file: input.audioFile,
          }
        : {
            kind: "text",
            text: input.transcript ?? "",
          },
    provider: resolveTranscriptionProvider(user),
    model: resolveTranscriptionModel(user),
  });

  return {
    transcript: transcription.transcript,
    result: await runAssistantWorkflow({
      userId,
      input: transcription.transcript,
      source: ASSISTANT_INPUT_SOURCE.VOICE,
    }),
  };
}
