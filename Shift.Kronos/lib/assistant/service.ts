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
import { appendConversationMessage, ensureConversation } from "@/lib/assistant/conversations";
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
import { db } from "@/lib/db";

function buildExecutedMessage(title: string, dueAt?: Date) {
  if (!dueAt) {
    return `Created reminder: ${title}.`;
  }

  return `Created reminder: ${title} for ${dueAt.toISOString()}.`;
}

function buildAnswerMessage(summary: string, evidence: string[]) {
  return evidence.length > 0 ? `${summary}\n\n${evidence.join("\n")}` : summary;
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
  const context = await getAssistantContextForUser(input.userId, now, input.input, conversation.id);

  await appendConversationMessage(conversation.id, ConversationMessageRole.USER, input.input, {
    source: input.source,
  });

  const action = assistantParseResultSchema.parse(
    await generateStructuredAssistantAction({
      input: input.input,
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
