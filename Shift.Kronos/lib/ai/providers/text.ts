import { getServerEnv } from "@/lib/env";
import { parseAssistantIntentHeuristically } from "@/lib/ai/heuristics";
import {
  AssistantAction,
  AssistantContext,
  ASSISTANT_ACTION_TYPE,
} from "@/lib/assistant/types";
import {
  ASSISTANT_PROVIDER,
  AssistantProvider,
  DEFAULT_ASSISTANT_MODEL_BY_PROVIDER,
} from "@/lib/ai/preferences";
import { memorySummarySchema } from "@/lib/memory/schemas";
import { logWarn } from "@/lib/observability/logger";
import {
  ConversationMessageRole,
  RecurrenceFrequency,
  ReminderPriority,
  ReminderType,
} from "@prisma/client";

export type StructuredAssistantRequest = {
  userId?: string;
  input: string;
  context: AssistantContext;
  provider?: AssistantProvider;
  model?: string;
};

export type StructuredMemorySummaryRequest = {
  userId?: string;
  conversationId: string;
  messages: Array<{
    role: ConversationMessageRole;
    content: string;
    createdAt: Date;
  }>;
  provider?: AssistantProvider;
  model?: string;
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type JsonSchemaDefinition = {
  name: string;
  schema: Record<string, unknown>;
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
  const summary = request.messages
    .slice(-6)
    .map((message) => `${message.role}: ${message.content.trim()}`)
    .join(" ")
    .slice(0, 600);

  return memorySummarySchema.parse({
    title: `Conversation memory ${request.messages[0]?.createdAt.toISOString().slice(0, 10) ?? request.conversationId}`,
    summary,
    salientFacts: facts.length > 0 ? facts : ["Conversation context was captured for future grounding."],
    openLoops,
    keywords: Array.from(new Set(summary.toLowerCase().match(/[a-z]{4,}/g) ?? [])).slice(0, 8),
  });
}

function serializeContext(context: AssistantContext) {
  return {
    timezone: context.timezone,
    now: context.now.toISOString(),
    activeReminders: context.activeReminders.map((item) => ({
      ...item,
      dueAt: item.dueAt ? item.dueAt.toISOString() : null,
    })),
    upcomingClasses: context.upcomingClasses.map((item) => ({
      ...item,
      startsAt: item.startsAt.toISOString(),
    })),
    knowledgeHighlights: context.knowledgeHighlights,
    memoryHighlights: context.memoryHighlights,
    recentConversation: context.recentConversation.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

function buildAssistantSystemPrompt() {
  return [
    "You are Shift:Kronos assistant.",
    "Return only valid JSON matching the requested schema.",
    "Do not wrap the JSON in markdown, code fences, or commentary.",
    "You must stay deterministic at the mutation boundary.",
    "Create reminders only when the user intent is clear enough.",
    "If timing or title is missing, ask a clarification question instead of inventing details.",
    "If the user asks about schedule, notes, files, or memory, answer grounded only in provided context.",
    "Never mention provider details or reasoning steps.",
  ].join(" ");
}

function buildMemorySystemPrompt() {
  return [
    "You summarize prior conversation turns for future grounding.",
    "Return only valid JSON matching the schema.",
    "Do not wrap the JSON in markdown, code fences, or commentary.",
    "Capture salient facts, open loops, and keywords without embellishment.",
    "Do not invent facts that are not present in the messages.",
  ].join(" ");
}

function buildAssistantUserPrompt(request: StructuredAssistantRequest) {
  return JSON.stringify(
    {
      input: request.input,
      context: serializeContext(request.context),
      allowedActionTypes: Object.values(ASSISTANT_ACTION_TYPE),
    },
    null,
    2,
  );
}

function buildMemoryUserPrompt(request: StructuredMemorySummaryRequest) {
  return JSON.stringify(
    {
      conversationId: request.conversationId,
      messages: request.messages.map((message) => ({
        role: message.role,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      })),
    },
    null,
    2,
  );
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("Model returned empty content.");
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("Model did not return a JSON object.");
  }

  return candidate.slice(firstBrace, lastBrace + 1);
}

async function fetchOpenRouterStructuredOutput(args: {
  env: ReturnType<typeof getServerEnv>;
  model: string;
  messages: ChatMessage[];
  jsonSchema: JsonSchemaDefinition;
}) {
  const response = await fetch(`${args.env.OPENROUTER_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.env.OPENROUTER_API_KEY}`,
      ...(args.env.OPENROUTER_HTTP_REFERER
        ? {
            "HTTP-Referer": args.env.OPENROUTER_HTTP_REFERER,
          }
        : {}),
      ...(args.env.OPENROUTER_TITLE
        ? {
            "X-OpenRouter-Title": args.env.OPENROUTER_TITLE,
          }
        : {}),
    },
    body: JSON.stringify({
      model: args.model,
      messages: [
        ...args.messages,
        {
          role: "system",
          content: [
            "JSON schema name:",
            args.jsonSchema.name,
            "JSON schema:",
            JSON.stringify(args.jsonSchema.schema),
          ].join(" "),
        },
      ],
      temperature: 0.1,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter chat completion failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ text?: string }> | null;
      };
    }>;
  };

  const content = payload.choices?.[0]?.message?.content;

  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .map((item) => {
              if (typeof item === "string") {
                return item;
              }

              if (item && typeof item === "object" && "text" in item) {
                return typeof item.text === "string" ? item.text : "";
              }

              return "";
            })
            .join("")
        : "";

  return JSON.parse(extractJsonObject(text)) as unknown;
}

async function generateStructuredJson(args: {
  userId?: string;
  provider: AssistantProvider;
  model: string;
  messages: ChatMessage[];
  jsonSchema: JsonSchemaDefinition;
}) {
  const env = getServerEnv();

  if (args.provider !== ASSISTANT_PROVIDER.OPENROUTER) {
    throw new Error(`Unsupported assistant provider: ${args.provider}`);
  }

  return fetchOpenRouterStructuredOutput({
    env,
    model: args.model,
    messages: args.messages,
    jsonSchema: args.jsonSchema,
  });
}

function getAssistantActionSchema(): JsonSchemaDefinition {
  return {
    name: "assistant_action",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        type: {
          type: "string",
          enum: Object.values(ASSISTANT_ACTION_TYPE),
        },
        confidence: {
          type: "string",
          enum: ["high", "medium"],
        },
        reminder: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            type: { type: "string", enum: ["ONE_TIME", "RECURRING", "HABIT", "COUNTDOWN", "INBOX"] },
            priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            category: { type: "string" },
            tags: {
              type: "array",
              items: { type: "string" },
            },
            dueAt: { type: "string" },
            recurrence: {
              type: "object",
              additionalProperties: false,
              properties: {
                frequency: { type: "string", enum: ["DAILY", "WEEKLY", "MONTHLY"] },
                interval: { type: "number" },
                daysOfWeek: {
                  type: "array",
                  items: { type: "number" },
                },
                endAt: { type: "string" },
              },
              required: ["frequency", "interval", "daysOfWeek"],
            },
          },
          required: ["title", "type", "priority", "tags"],
        },
        answer: {
          type: "object",
          additionalProperties: false,
          properties: {
            summary: { type: "string" },
            evidence: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["summary", "evidence"],
        },
        clarification: {
          type: "object",
          additionalProperties: false,
          properties: {
            missingFields: {
              type: "array",
              items: { type: "string" },
            },
            question: { type: "string" },
          },
          required: ["missingFields", "question"],
        },
        reason: { type: "string" },
      },
      required: ["type"],
    },
  };
}

function getMemorySummarySchema(): JsonSchemaDefinition {
  return {
    name: "memory_summary",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        salientFacts: {
          type: "array",
          items: { type: "string" },
        },
        openLoops: {
          type: "array",
          items: { type: "string" },
        },
        keywords: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["title", "summary", "salientFacts", "openLoops", "keywords"],
    },
  };
}

export async function generateStructuredAssistantAction(
  request: StructuredAssistantRequest,
): Promise<AssistantAction> {
  const env = getServerEnv();

  if (env.PHASE4_FAKE_AI === "1") {
    return parseAssistantIntentHeuristically(request.input, request.context);
  }

  const provider = request.provider ?? ASSISTANT_PROVIDER.OPENROUTER;
  const model = request.model ?? DEFAULT_ASSISTANT_MODEL_BY_PROVIDER[provider];

  try {
    const output = await generateStructuredJson({
      userId: request.userId,
      provider,
      model,
      jsonSchema: getAssistantActionSchema(),
      messages: [
        {
          role: "system",
          content: buildAssistantSystemPrompt(),
        },
        {
          role: "user",
          content: buildAssistantUserPrompt(request),
        },
      ],
    });

    return normalizeAssistantAction(output);
  } catch (error) {
    logWarn("assistant.provider.openrouter-fallback", {
      provider,
      model,
      userId: request.userId,
      error,
    });

    return parseAssistantIntentHeuristically(request.input, request.context);
  }
}

export async function generateStructuredMemorySummary(request: StructuredMemorySummaryRequest) {
  const env = getServerEnv();

  if (env.PHASE6_FAKE_SUMMARIES === "1" || env.PHASE4_FAKE_AI === "1") {
    return buildFallbackMemorySummary(request);
  }

  const provider = request.provider ?? ASSISTANT_PROVIDER.OPENROUTER;
  const model = request.model ?? DEFAULT_ASSISTANT_MODEL_BY_PROVIDER[provider];

  try {
    const output = await generateStructuredJson({
      userId: request.userId,
      provider,
      model,
      jsonSchema: getMemorySummarySchema(),
      messages: [
        {
          role: "system",
          content: buildMemorySystemPrompt(),
        },
        {
          role: "user",
          content: buildMemoryUserPrompt(request),
        },
      ],
    });

    return memorySummarySchema.parse(output);
  } catch (error) {
    logWarn("memory.provider.openrouter-fallback", {
      provider,
      model,
      userId: request.userId,
      error,
    });

    return buildFallbackMemorySummary(request);
  }
}

function normalizeAssistantAction(output: unknown): AssistantAction {
  if (!output || typeof output !== "object") {
    throw new Error("Assistant output must be an object.");
  }

  const value = output as Record<string, unknown>;

  if (value.type === ASSISTANT_ACTION_TYPE.CREATE_REMINDER) {
    const reminder = value.reminder as Record<string, unknown> | undefined;

    return {
      type: ASSISTANT_ACTION_TYPE.CREATE_REMINDER,
      confidence: value.confidence === "medium" ? "medium" : "high",
      reminder: {
        title: String(reminder?.title ?? ""),
        description: typeof reminder?.description === "string" ? reminder.description : undefined,
        type: String(reminder?.type ?? ReminderType.INBOX) as ReminderType,
        priority: String(reminder?.priority ?? ReminderPriority.MEDIUM) as ReminderPriority,
        category: typeof reminder?.category === "string" ? reminder.category : undefined,
        tags: Array.isArray(reminder?.tags) ? reminder.tags.map((item) => String(item)) : [],
        dueAt: typeof reminder?.dueAt === "string" && reminder.dueAt ? new Date(reminder.dueAt) : undefined,
        recurrence:
          reminder?.recurrence && typeof reminder.recurrence === "object"
            ? {
                frequency: String((reminder.recurrence as Record<string, unknown>).frequency) as RecurrenceFrequency,
                interval: Number((reminder.recurrence as Record<string, unknown>).interval ?? 1),
                daysOfWeek: Array.isArray((reminder.recurrence as Record<string, unknown>).daysOfWeek)
                  ? ((reminder.recurrence as Record<string, unknown>).daysOfWeek as unknown[]).map((item) => Number(item))
                  : [],
                endAt:
                  typeof (reminder.recurrence as Record<string, unknown>).endAt === "string"
                    ? new Date(String((reminder.recurrence as Record<string, unknown>).endAt))
                    : undefined,
              }
            : undefined,
      },
    };
  }

  if (value.type === ASSISTANT_ACTION_TYPE.ANSWER_QUESTION) {
    const answer = value.answer as Record<string, unknown> | undefined;

    return {
      type: ASSISTANT_ACTION_TYPE.ANSWER_QUESTION,
      answer: {
        summary: String(answer?.summary ?? ""),
        evidence: Array.isArray(answer?.evidence) ? answer.evidence.map((item) => String(item)) : [],
      },
    };
  }

  if (value.type === ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS) {
    const clarification = value.clarification as Record<string, unknown> | undefined;

    return {
      type: ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS,
      clarification: {
        missingFields: Array.isArray(clarification?.missingFields)
          ? clarification.missingFields.map((item) => String(item))
          : [],
        question: String(clarification?.question ?? ""),
      },
    };
  }

  return {
    type: ASSISTANT_ACTION_TYPE.REJECT_REQUEST,
    reason: String(value.reason ?? "I could not process that request."),
  };
}
