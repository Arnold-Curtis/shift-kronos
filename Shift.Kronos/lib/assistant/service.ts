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
import { createTimetableEntry, updateTimetableEntry, deleteTimetableEntry } from "@/lib/timetable/service";
import { db } from "@/lib/db";
import { formatDateLabel } from "@/lib/datetime";
import { executeSearchMemory } from "@/lib/assistant/queries";
import { createMemoryForEntity, updateMemoryForEntity } from "@/lib/memory/dual-write";
import { createNote, deleteNote } from "@/lib/notes/service";
import { deleteReminder } from "@/lib/reminders/service";

type RecentEntityReference =
  | {
      kind: "reminder";
      title: string;
      dueAt: Date | null;
      priority: string;
    }
  | {
      kind: "timetable";
      subject: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      semesterStart: Date;
      semesterEnd: Date;
    };

function buildExecutedMessage(title: string, dueAt?: Date) {
  if (!dueAt) {
    return `Created reminder: ${title}.`;
  }

  return `Created reminder: ${title} for ${dueAt.toISOString()}.`;
}

function buildNoteCreatedMessage(title: string) {
  return `Created note: ${title}.`;
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

function buildTimetableUpdatedMessage(subject: string, updates: Record<string, unknown>) {
  const changedFields = Object.keys(updates).filter((k) => updates[k] !== undefined);
  if (changedFields.length === 0) {
    return `No changes made to ${subject}.`;
  }
  return `Updated ${subject}: ${changedFields.join(", ")} changed.`;
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

function getRecentEntityReference(
  recentConversation: Array<{
    role: ConversationMessageRole;
    content: string;
    structuredData: unknown;
  }>,
): RecentEntityReference | null {
  for (const message of recentConversation) {
    if (message.role !== ConversationMessageRole.ASSISTANT || !message.structuredData || typeof message.structuredData !== "object") {
      continue;
    }

    const candidate = message.structuredData as Record<string, unknown>;

    if (candidate.type === ASSISTANT_ACTION_TYPE.CREATE_REMINDER) {
      const reminder = candidate.reminder as Record<string, unknown> | undefined;

      if (!reminder?.title) {
        continue;
      }

      return {
        kind: "reminder",
        title: String(reminder.title),
        dueAt: typeof reminder.dueAt === "string" && reminder.dueAt ? new Date(reminder.dueAt) : null,
        priority: typeof reminder.priority === "string" ? reminder.priority : "MEDIUM",
      };
    }

    if (candidate.type === ASSISTANT_ACTION_TYPE.CREATE_TIMETABLE_ENTRY) {
      const timetableEntry = candidate.timetableEntry as Record<string, unknown> | undefined;

      if (
        !timetableEntry?.subject ||
        typeof timetableEntry.dayOfWeek !== "number" ||
        typeof timetableEntry.startTime !== "string" ||
        typeof timetableEntry.endTime !== "string" ||
        typeof timetableEntry.semesterStart !== "string" ||
        typeof timetableEntry.semesterEnd !== "string"
      ) {
        continue;
      }

      return {
        kind: "timetable",
        subject: String(timetableEntry.subject),
        dayOfWeek: timetableEntry.dayOfWeek,
        startTime: timetableEntry.startTime,
        endTime: timetableEntry.endTime,
        semesterStart: new Date(timetableEntry.semesterStart),
        semesterEnd: new Date(timetableEntry.semesterEnd),
      };
    }
  }

  return null;
}

function resolveRecentEntityFollowUp(
  input: string,
  recentConversation: Array<{
    role: ConversationMessageRole;
    content: string;
    structuredData: unknown;
  }>,
) {
  const normalizedInput = input.trim();
  const lower = normalizedInput.toLowerCase();

  if (!normalizedInput) {
    return null;
  }

  const referencesRecentEntity =
    /\b(it|that|this reminder|that reminder|this class|that class)\b/i.test(normalizedInput) ||
    lower.includes("again");

  if (!referencesRecentEntity) {
    return null;
  }

  const entity = getRecentEntityReference(recentConversation);

  if (!entity) {
    return null;
  }

  if (entity.kind === "reminder") {
    if (lower.includes("when") || lower.includes("due") || lower.includes("again")) {
      return `What is the schedule for reminder ${entity.title}${entity.dueAt ? ` due ${entity.dueAt.toISOString()}` : ""}?`;
    }
  }

  if (entity.kind === "timetable") {
    if (lower.includes("when") || lower.includes("again") || lower.includes("what time")) {
      return `What is the schedule for class ${entity.subject} from ${entity.startTime} to ${entity.endTime}?`;
    }
  }

  return null;
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
    lower.startsWith("note that") ||
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

function looksLikeStandaloneIntent(input: string) {
  const lower = input.trim().toLowerCase();

  return (
    lower.startsWith("remind me") ||
    lower.startsWith("add a reminder") ||
    lower.startsWith("set a reminder") ||
    lower.startsWith("set reminder") ||
    lower.startsWith("add reminder") ||
    lower.startsWith("create reminder") ||
    lower.startsWith("note that") ||
    lower.startsWith("add a timetable entry") ||
    lower.startsWith("add timetable entry") ||
    lower.startsWith("add a class") ||
    lower.startsWith("add class") ||
    lower.startsWith("schedule a class") ||
    lower.startsWith("what ") ||
    lower.startsWith("do ") ||
    lower.startsWith("can ")
  );
}

function looksLikeBareTimeReply(input: string) {
  return /^(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)$/i.test(input.trim());
}

function getClarificationAnchorMessage(
  recentConversation: Array<{
    role: ConversationMessageRole;
    content: string;
    structuredData: unknown;
  }>,
) {
  for (let index = 0; index < recentConversation.length; index += 1) {
    const message = recentConversation[index];

    if (message.role !== ConversationMessageRole.ASSISTANT || !message.structuredData || typeof message.structuredData !== "object") {
      continue;
    }

    const candidate = message.structuredData as Record<string, unknown>;

    if (candidate.type !== ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS) {
      continue;
    }

    for (let userIndex = recentConversation.length - 1; userIndex > index; userIndex -= 1) {
      const userMessage = recentConversation[userIndex];

      if (userMessage.role === ConversationMessageRole.USER) {
        return {
          anchor: userMessage.content.trim(),
          clarification: candidate,
        };
      }
    }
  }

  return null;
}

export function buildStructuredFollowUpInput(
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

  const recentEntityFollowUp = resolveRecentEntityFollowUp(input, recentConversation);

  if (recentEntityFollowUp) {
    return recentEntityFollowUp;
  }

  const recent = [...recentConversation];
  const clarificationContext = getClarificationAnchorMessage(recent);
  const lastAssistantClarification = clarificationContext?.clarification;

  if (!lastAssistantClarification) {
    return buildFollowUpInput(input, recentConversation.map((message) => ({ role: message.role, content: message.content })));
  }

  const clarification = lastAssistantClarification.clarification as Record<string, unknown> | undefined;
  const missingFields = Array.isArray(clarification?.missingFields)
    ? clarification.missingFields.map((item) => String(item))
    : [];

  if (!clarificationContext?.anchor) {
    return input;
  }

  if (looksLikeStandaloneIntent(normalizedInput)) {
    return input;
  }

  const anchor = clarificationContext.anchor;

  if (missingFields.includes("endTime") && looksLikeBareTimeReply(normalizedInput)) {
    return `${anchor} to ${normalizedInput}`;
  }

  if (missingFields.includes("startTime") && looksLikeBareTimeReply(normalizedInput)) {
    return `${anchor} at ${normalizedInput}`;
  }

  if (missingFields.length === 0) {
    return `${anchor} ${normalizedInput}`;
  }

  return `${anchor} ${normalizedInput}`;
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

  const result = await executeAction(action, input.userId, conversation.id);

  await processConversationMemory(input.userId, conversation.id);

  return result;
}

async function executeAction(
  action: AssistantAction,
  userId: string,
  conversationId: string,
): Promise<AssistantWorkflowResult> {
  if (action.type === ASSISTANT_ACTION_TYPE.CREATE_REMINDER) {
    const reminder = await createReminder(userId, action.reminder);

    await createMemoryForEntity({
      userId,
      entityType: "REMINDER",
      entityId: reminder.id,
      entityTitle: reminder.title,
      entityContent: `${reminder.title}${reminder.description ? ` - ${reminder.description}` : ""}`,
      conversationId,
    });

    const message = buildExecutedMessage(action.reminder.title, action.reminder.dueAt);
    await appendConversationMessage(conversationId, ConversationMessageRole.ASSISTANT, message, action);

    return {
      kind: ASSISTANT_RESULT_KIND.EXECUTED,
      action,
      message,
      conversationId,
    };
  }

  if (action.type === ASSISTANT_ACTION_TYPE.CREATE_NOTE) {
    const note = await createNote(userId, {
      title: action.note.title,
      content: action.note.content,
      tags: action.note.tags ?? [],
    });

    if (action.alsoCreateMemory) {
      await createMemoryForEntity({
        userId,
        entityType: "NOTE",
        entityId: note.id,
        entityTitle: note.title,
        entityContent: note.content,
        conversationId,
      });
    }

    const message = buildNoteCreatedMessage(action.note.title);
    await appendConversationMessage(conversationId, ConversationMessageRole.ASSISTANT, message, action);

    return {
      kind: ASSISTANT_RESULT_KIND.EXECUTED,
      action,
      message,
      conversationId,
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
        conversationId,
        ConversationMessageRole.ASSISTANT,
        clarificationAction.clarification.question,
        clarificationAction,
      );

      return {
        kind: ASSISTANT_RESULT_KIND.CLARIFICATION,
        action: clarificationAction,
        message: clarificationAction.clarification.question,
        conversationId,
      };
    }

    const entry = await createTimetableEntry(userId, {
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

    await createMemoryForEntity({
      userId,
      entityType: "TIMETABLE_ENTRY",
      entityId: entry.id,
      entityTitle: entry.subject,
      entityContent: `${entry.subject} on ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][entry.dayOfWeek - 1]} from ${entry.startTime} to ${entry.endTime}${entry.location ? ` at ${entry.location}` : ""}`,
      conversationId,
    });

    const message = buildTimetableExecutedMessage({
      subject: entry.subject,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      semesterStart: entry.semesterStart,
      semesterEnd: entry.semesterEnd,
    });
    await appendConversationMessage(conversationId, ConversationMessageRole.ASSISTANT, message, action);

    return {
      kind: ASSISTANT_RESULT_KIND.EXECUTED,
      action,
      message,
      conversationId,
    };
  }

  if (action.type === ASSISTANT_ACTION_TYPE.UPDATE_TIMETABLE_ENTRY) {
    const entry = await updateTimetableEntry(userId, action.entryId, action.updates);

    await updateMemoryForEntity(entry.id, "TIMETABLE_ENTRY", {
      title: entry.subject,
      content: `${entry.subject} on ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][entry.dayOfWeek - 1]} from ${entry.startTime} to ${entry.endTime}${entry.location ? ` at ${entry.location}` : ""}`,
    });

    const message = buildTimetableUpdatedMessage(entry.subject, action.updates);
    await appendConversationMessage(conversationId, ConversationMessageRole.ASSISTANT, message, action);

    return {
      kind: ASSISTANT_RESULT_KIND.EXECUTED,
      action,
      message,
      conversationId,
    };
  }

  if (action.type === ASSISTANT_ACTION_TYPE.DELETE_ENTITY) {
    if (action.requiresConfirmation) {
      const message = `Are you sure you want to delete this ${action.entityType.toLowerCase()}?`;
      await appendConversationMessage(conversationId, ConversationMessageRole.ASSISTANT, message, action);

      return {
        kind: ASSISTANT_RESULT_KIND.CONFIRMATION,
        action,
        message,
        conversationId,
      };
    }

    let message: string;
    if (action.entityType === "REMINDER") {
      await deleteReminder(userId, action.entityId);
      message = "Reminder deleted.";
    } else if (action.entityType === "NOTE") {
      await deleteNote(userId, action.entityId);
      message = "Note deleted.";
    } else if (action.entityType === "TIMETABLE_ENTRY") {
      await deleteTimetableEntry(userId, action.entityId);
      message = "Timetable entry deleted.";
    } else {
      message = "Entity deleted.";
    }

    await appendConversationMessage(conversationId, ConversationMessageRole.ASSISTANT, message, action);

    return {
      kind: ASSISTANT_RESULT_KIND.EXECUTED,
      action,
      message,
      conversationId,
    };
  }

  if (action.type === ASSISTANT_ACTION_TYPE.SEARCH_MEMORY) {
    const searchResult = await executeSearchMemory({
      userId,
      query: action.query,
      target: action.target,
      timeContext: action.timeContext,
    });

    const message = buildAnswerMessage(searchResult.summary, searchResult.evidence);
    await appendConversationMessage(conversationId, ConversationMessageRole.ASSISTANT, message, {
      ...action,
      answer: searchResult,
    });

    return {
      kind: ASSISTANT_RESULT_KIND.ANSWERED,
      action: {
        ...action,
        answer: searchResult,
      },
      message,
      conversationId,
    };
  }

  if (action.type === ASSISTANT_ACTION_TYPE.ANSWER_QUESTION) {
    const message = buildAnswerMessage(action.answer.summary, action.answer.evidence);
    await appendConversationMessage(conversationId, ConversationMessageRole.ASSISTANT, message, action);

    return {
      kind: ASSISTANT_RESULT_KIND.ANSWERED,
      action,
      message,
      conversationId,
    };
  }

  if (action.type === ASSISTANT_ACTION_TYPE.DISAMBIGUATE) {
    const message = "I'm not sure what you mean. Please choose one of the following options.";
    await appendConversationMessage(conversationId, ConversationMessageRole.ASSISTANT, message, action);

    return {
      kind: ASSISTANT_RESULT_KIND.DISAMBIGUATION,
      action,
      message,
      conversationId,
    };
  }

  if (action.type === ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS) {
    await appendConversationMessage(
      conversationId,
      ConversationMessageRole.ASSISTANT,
      action.clarification.question,
      action,
    );

    return {
      kind: ASSISTANT_RESULT_KIND.CLARIFICATION,
      action,
      message: action.clarification.question,
      conversationId,
    };
  }

  const message = action.reason;
  await appendConversationMessage(conversationId, ConversationMessageRole.ASSISTANT, message, action);

  return {
    kind: ASSISTANT_RESULT_KIND.REJECTED,
    action,
    message,
    conversationId,
  };
}

export async function runVoiceAssistantWorkflow(
  userId: string,
  input: { transcript?: string; audioFile?: File | null; conversationId?: string },
) {
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
      conversationId: input.conversationId,
    }),
  };
}
