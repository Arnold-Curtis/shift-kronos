import { getServerEnv } from "@/lib/env";
import { parseAssistantIntentHeuristically } from "@/lib/ai/heuristics";
import { AssistantAction, AssistantContext } from "@/lib/assistant/types";
import { memorySummarySchema } from "@/lib/memory/schemas";
import { ConversationMessageRole } from "@prisma/client";

export type StructuredAssistantRequest = {
  input: string;
  context: AssistantContext;
};

export type StructuredMemorySummaryRequest = {
  conversationId: string;
  messages: Array<{
    role: ConversationMessageRole;
    content: string;
    createdAt: Date;
  }>;
};

function buildFallbackMemorySummary(request: StructuredMemorySummaryRequest) {
  const facts = request.messages
    .filter((message) => message.role === ConversationMessageRole.USER)
    .map((message) => message.content.trim())
    .filter(Boolean)
    .slice(-3);
  const openLoops = request.messages
    .filter((message) => message.role === ConversationMessageRole.ASSISTANT)
    .map((message) => message.content.trim())
    .filter((message) => /\?|clarify|follow up|next|need/i.test(message))
    .slice(-2);
  const summary = request.messages.slice(-6).map((message) => `${message.role}: ${message.content.trim()}`).join(" ").slice(0, 600);

  return memorySummarySchema.parse({
    title: `Conversation memory ${request.messages[0]?.createdAt.toISOString().slice(0, 10) ?? request.conversationId}`,
    summary,
    salientFacts: facts.length > 0 ? facts : ["Conversation context was captured for future grounding."],
    openLoops,
    keywords: Array.from(new Set(summary.toLowerCase().match(/[a-z]{4,}/g) ?? [])).slice(0, 8),
  });
}

export async function generateStructuredAssistantAction(
  request: StructuredAssistantRequest,
): Promise<AssistantAction> {
  const env = getServerEnv();

  // Phase 4 keeps a deterministic fallback so capture does not collapse if an AI provider is unavailable.
  if (env.PHASE4_FAKE_AI === "1") {
    return parseAssistantIntentHeuristically(request.input, request.context);
  }

  return parseAssistantIntentHeuristically(request.input, request.context);
}

export async function generateStructuredMemorySummary(request: StructuredMemorySummaryRequest) {
  const env = getServerEnv();

  if (env.PHASE6_FAKE_SUMMARIES === "1" || env.PHASE4_FAKE_AI === "1") {
    return buildFallbackMemorySummary(request);
  }

  return buildFallbackMemorySummary(request);
}
