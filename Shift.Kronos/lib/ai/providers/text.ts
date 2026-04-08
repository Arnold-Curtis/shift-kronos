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
  getAssistantProviderOptions,
} from "@/lib/ai/preferences";
import { memorySummarySchema } from "@/lib/memory/schemas";
import { logWarn } from "@/lib/observability/logger";
import {
  ConversationMessageRole,
  RecurrenceFrequency,
  ReminderPriority,
  ReminderType,
} from "@prisma/client";
import { formatDateForModel, formatDateTimeForModel, formatTimeForModel } from "@/lib/datetime";

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
  const timezone = context.timezone || "Africa/Nairobi";

  return {
    timezone: context.timezone,
    nowUtc: context.now.toISOString(),
    nowLocal: formatDateTimeForModel(context.now, timezone),
    currentLocalTime: formatTimeForModel(context.now, timezone),
    highIntegrityFacts: context.highIntegrityFacts,
    activeReminders: context.activeReminders.map((item) => ({
      ...item,
      dueAt: item.dueAt ? item.dueAt.toISOString() : null,
      dueAtLocal: item.dueAt ? formatDateTimeForModel(item.dueAt, timezone) : null,
    })),
    upcomingClasses: context.upcomingClasses.map((item) => ({
      ...item,
      startsAt: item.startsAt.toISOString(),
      startsAtLocal: formatDateTimeForModel(item.startsAt, timezone),
      startTimeLocal: formatTimeForModel(item.startsAt, timezone),
    })),
    timetableEntries: context.timetableEntries?.map((item) => ({
      ...item,
      semesterStart: item.semesterStart?.toISOString(),
      semesterEnd: item.semesterEnd?.toISOString(),
      semesterStartLocal: item.semesterStart ? formatDateForModel(item.semesterStart, timezone) : null,
      semesterEndLocal: item.semesterEnd ? formatDateForModel(item.semesterEnd, timezone) : null,
    })),
    semesterContext: context.semesterContext ? {
      semesterStart: context.semesterContext.semesterStart?.toISOString(),
      semesterEnd: context.semesterContext.semesterEnd?.toISOString(),
      semesterStartLocal: context.semesterContext.semesterStart
        ? formatDateForModel(context.semesterContext.semesterStart, timezone)
        : null,
      semesterEndLocal: context.semesterContext.semesterEnd
        ? formatDateForModel(context.semesterContext.semesterEnd, timezone)
        : null,
    } : null,
    knowledgeHighlights: context.knowledgeHighlights,
    memoryHighlights: context.memoryHighlights,
    recentMemoryArtifacts: context.recentMemoryArtifacts?.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
    recentConversation: context.recentConversation.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
    resolvedFollowUpTarget: context.resolvedFollowUpTarget ?? null,
  };
}

function buildAssistantSystemPrompt(): string {
  return `You are Shift:Kronos, an intelligent personal assistant that helps users manage reminders, notes, timetable entries, and memory.

## CRITICAL RULES

1. OUTPUT FORMAT: Return ONLY valid JSON matching the schema. No markdown, no code fences, no commentary.
2. DETERMINISTIC BOUNDARY: You must stay deterministic at the mutation boundary. Never invent details not provided by the user.
3. For user-facing time/date answers, prefer the local-time context fields such as nowLocal, currentLocalTime, startsAtLocal, startTimeLocal, and dueAtLocal. Do not answer with raw UTC ISO timestamps unless the user explicitly asks for UTC.

## DECISION RULES

### Entity Type Inference

Analyze the user's intent to determine the correct entity type:

| User Phrasing | Entity Type | Reasoning |
|---------------|-------------|-----------|
| "remind me to..." | REMINDER | Explicit reminder request |
| "I have a meeting at 3pm" | REMINDER | One-time event, no recurrence |
| "I have a class every Monday" | TIMETABLE_ENTRY | Recurring weekly pattern |
| "note that..." / "remember that..." | NOTE | Explicit note request |
| "my class changed..." | UPDATE_TIMETABLE_ENTRY | Modification request |
| "change the reminder to..." | UPDATE_REMINDER | Reminder modification |
| "update my note..." | UPDATE_NOTE | Note modification |
| "what class do I have..." | SEARCH_MEMORY | Query, not creation |
| "what did I say about..." | SEARCH_MEMORY | Memory recall query |

### Follow-Up Resolution Rules — CRITICAL

When the user says "change that to 6pm", "move it to tomorrow", "update the reminder", or similar follow-up phrases:

1. **Check resolvedFollowUpTarget in the context first.** If it is present, use its entityType, entityId, and suggestedAction to determine the correct action. This is the highest-priority signal.

2. **Check recentActions in highIntegrityFacts.** This lists the most recently created/updated/deleted entities in reverse chronological order. The most recent mutated entity is the default target for pronouns like "it" or "that".

3. **Domain keywords override recency.** If the user says "change the reminder to 6pm" or "no, I meant the reminder", the word "reminder" overrides any other entity type. Similarly, "class" or "timetable" overrides toward TIMETABLE_ENTRY.

4. **NEVER mutate a timetable entry when the user is clearly referring to a reminder.** A time-change follow-up about a reminder MUST use UPDATE_REMINDER, never UPDATE_TIMETABLE_ENTRY.

5. **NEVER mutate a reminder when the user is clearly referring to a timetable entry.** A time-change follow-up about a class MUST use UPDATE_TIMETABLE_ENTRY, never UPDATE_REMINDER.

6. **When the user corrects a previous mistake** (e.g., "no, I meant the reminder"), ALWAYS switch to the corrected entity type immediately.

### Time Inference

When time is given but date is missing, infer the most logical next occurrence:

- If current time is BEFORE the given time today → schedule for today
- If current time is AFTER the given time today → schedule for tomorrow
- For timetable entries, use semester context from existing entries

Examples:
- Now: Monday 1pm, Input: "at 3pm" → Today (Monday) 3pm
- Now: Monday 4pm, Input: "at 3pm" → Tomorrow (Tuesday) 3pm
- Now: Friday 10am, Input: "on Monday at 8am" → Next Monday 8am

### Semester Inference

For timetable entries without explicit semester bounds:
1. Check existing timetable entries for semester dates
2. If found, use the same semester range
3. If no entries exist, assume current semester (current month to +4 months)

### Query vs Creation Detection

| Pattern | Action | Notes |
|---------|--------|-------|
| "what class do I have..." | SEARCH_MEMORY | Query existing data |
| "what's due..." | SEARCH_MEMORY | Query reminders |
| "what did I say about..." | SEARCH_MEMORY | Memory recall |
| "remind me to..." | CREATE_REMINDER | Creation |
| "add a reminder" | CREATE_REMINDER | Creation |
| "I have a meeting" | CREATE_REMINDER | Implicit creation |
| "note that..." | CREATE_NOTE | Note creation |

### Ambiguity Handling

- If truly ambiguous, pick the most likely option and mention alternatives in the response
- Use DISAMBIGUATE action only for high-impact decisions:
  - Deleting multiple items
  - Conflicting interpretations with equal probability
  - Actions that cannot be easily undone

## RESPONSE GUIDELINES

1. For creations: Brief confirmation + offer follow-up actions
2. For queries: Direct answer + source evidence + offer related actions
3. For updates: Confirmation of what changed
4. For deletions: Require confirmation if impact is high

## CONTEXT USAGE

You will receive context including:
- Current time and timezone
- Recent reminders (last 12 scheduled)
- Upcoming classes (next 8 occurrences)
- Memory highlights from semantic search
- Recent conversation history

Use this context to:
- Resolve relative time references ("tomorrow", "next Monday")
- Infer missing details from patterns
- Provide accurate query responses
- Maintain conversation continuity

## EXAMPLES

### Example 1: One-time reminder
Input: "I have a meeting at 3pm"
Context: { now: "2024-04-08T13:00:00Z" }
Output: { "type": "create_reminder", "confidence": "high", "reminder": { "title": "Meeting", "type": "ONE_TIME", "priority": "MEDIUM", "dueAt": "2024-04-08T15:00:00Z" } }

### Example 2: Note with memory
Input: "Note that I need to make breakfast in the morning"
Output: { "type": "create_note", "confidence": "high", "note": { "title": "Morning breakfast routine", "content": "I need to make breakfast in the morning", "tags": ["routine", "morning"] }, "alsoCreateMemory": true }

### Example 3: Timetable query
Input: "What class do I have tomorrow at 8am?"
Context: { now: "2024-04-08T10:00:00Z", upcomingClasses: [{ subject: "Business Communications", dayOfWeek: 2, startTime: "08:00" }] }
Output: { "type": "search_memory", "query": "class tomorrow 8am", "target": "SCHEDULE", "timeContext": { "date": "2024-04-09", "timeRange": { "start": "08:00", "end": "09:00" } } }

### Example 4: Timetable update
Input: "My Monday 8am class changed from Biology to Chemistry"
Context: { timetableEntries: [{ id: "abc123", subject: "Biology", dayOfWeek: 1, startTime: "08:00" }] }
Output: { "type": "update_timetable_entry", "confidence": "high", "entryId": "abc123", "updates": { "subject": "Chemistry" } }

### Example 5: Ambiguous input with best guess
Input: "Add a reminder to pick up my shoes at 8am"
Context: { now: "2024-04-08T10:00:00Z" }
Output: { "type": "create_reminder", "confidence": "high", "reminder": { "title": "Pick up my shoes", "type": "ONE_TIME", "priority": "MEDIUM", "dueAt": "2024-04-09T08:00:00Z" } }

### Example 6: Memory recall
Input: "What did I say about breakfast?"
Context: { memoryHighlights: [{ content: "User wants to make breakfast in the morning", title: "Morning routine" }] }
Output: { "type": "search_memory", "query": "breakfast", "target": "MEMORY", "answer": { "summary": "You mentioned wanting to make breakfast in the morning.", "evidence": ["Memory: Morning breakfast routine"], "sources": [{ "type": "MEMORY", "id": "mem123", "title": "Morning routine" }] } }

### Example 7: Update a reminder (follow-up)
Input: "Change that to 6pm"
Context: { resolvedFollowUpTarget: { entityType: "REMINDER", entityId: "rem_abc", entityTitle: "Go hit the gym", suggestedAction: "UPDATE_REMINDER" }, highIntegrityFacts: { recentActions: [{ actionType: "create_reminder", entityType: "REMINDER", entityId: "rem_abc", entityTitle: "Go hit the gym" }] } }
Output: { "type": "update_reminder", "confidence": "high", "reminderId": "rem_abc", "updates": { "dueAt": "2026-04-08T15:00:00.000Z" } }

### Example 8: Correction — user clarifies entity type
Input: "No, I meant the reminder. Change it to 6pm."
Context: { resolvedFollowUpTarget: { entityType: "REMINDER", entityId: "rem_abc", entityTitle: "Go hit the gym", suggestedAction: "UPDATE_REMINDER" } }
Output: { "type": "update_reminder", "confidence": "high", "reminderId": "rem_abc", "updates": { "dueAt": "2026-04-08T15:00:00.000Z" } }

### Example 9: Update a timetable entry (explicit class reference)
Input: "Move my Monday class to 9am"
Context: { timetableEntries: [{ id: "entry_xyz", subject: "IT Project I", dayOfWeek: 1, startTime: "08:00", endTime: "10:00" }] }
Output: { "type": "update_timetable_entry", "confidence": "high", "entryId": "entry_xyz", "updates": { "startTime": "09:00" } }`;
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
    const errorBody = await response.text();
    throw new Error(`OpenRouter chat completion failed with status ${response.status}: ${errorBody.slice(0, 600)}`);
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

function getAssistantFallbackModels(primaryModel: string) {
  const suggested = getAssistantProviderOptions()
    .flatMap((option) => option.suggestedModels)
    .filter((model, index, all) => all.indexOf(model) === index);

  return [primaryModel, ...suggested.filter((model) => model !== primaryModel)];
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
          enum: ["high", "medium", "low"],
        },
        reminder: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string", maxLength: 160 },
            description: { type: "string" },
            type: { type: "string", enum: ["ONE_TIME", "RECURRING", "HABIT", "COUNTDOWN", "INBOX"] },
            priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            category: { type: "string" },
            tags: {
              type: "array",
              items: { type: "string" },
            },
            dueAt: { type: "string", format: "date-time" },
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
                endAt: { type: "string", format: "date-time" },
              },
              required: ["frequency", "interval", "daysOfWeek"],
            },
          },
          required: ["title", "type", "priority", "tags"],
        },
        note: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string", maxLength: 160 },
            content: { type: "string" },
            tags: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["title", "content"],
        },
        alsoCreateMemory: { type: "boolean" },
        timetableEntry: {
          type: "object",
          additionalProperties: false,
          properties: {
            subject: { type: "string", maxLength: 160 },
            location: { type: "string" },
            lecturer: { type: "string" },
            dayOfWeek: { type: "number", minimum: 1, maximum: 7 },
            startTime: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
            endTime: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
            semesterStart: { type: "string", format: "date-time" },
            semesterEnd: { type: "string", format: "date-time" },
            reminderLeadMinutes: { type: "number" },
          },
          required: ["subject"],
        },
        entryId: { type: "string" },
        reminderId: { type: "string" },
        noteId: { type: "string" },
        updates: {
          type: "object",
          additionalProperties: false,
          properties: {
            subject: { type: "string" },
            startTime: { type: "string" },
            endTime: { type: "string" },
            location: { type: "string" },
            lecturer: { type: "string" },
          },
        },
        reminderUpdates: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string", maxLength: 160 },
            description: { type: "string" },
            priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            dueAt: { type: "string", format: "date-time" },
          },
        },
        noteUpdates: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string", maxLength: 160 },
            content: { type: "string" },
            tags: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
        entityType: { type: "string", enum: ["REMINDER", "NOTE", "TIMETABLE_ENTRY"] },
        entityId: { type: "string" },
        requiresConfirmation: { type: "boolean" },
        query: { type: "string" },
        target: { type: "string", enum: ["SCHEDULE", "MEMORY", "REMINDERS", "NOTES", "ALL"] },
        timeContext: {
          type: "object",
          additionalProperties: false,
          properties: {
            date: { type: "string", format: "date" },
            dayOfWeek: { type: "number" },
            timeRange: {
              type: "object",
              additionalProperties: false,
              properties: {
                start: { type: "string" },
                end: { type: "string" },
              },
            },
          },
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
            sources: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  type: { type: "string" },
                  id: { type: "string" },
                  title: { type: "string" },
                },
              },
            },
          },
          required: ["summary", "evidence"],
        },
        options: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              label: { type: "string" },
              action: { type: "object" },
              description: { type: "string" },
            },
            required: ["label", "action", "description"],
          },
        },
        defaultOption: { type: "number" },
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
  const provider = request.provider ?? ASSISTANT_PROVIDER.OPENROUTER;
  const model = request.model ?? DEFAULT_ASSISTANT_MODEL_BY_PROVIDER[provider];
  const candidateModels = getAssistantFallbackModels(model);
  let lastError: unknown = null;

  const LLM_TIMEOUT_MS = 15000; // 15 seconds

  for (const candidateModel of candidateModels) {
    try {
      const output = await Promise.race([
        generateStructuredJson({
          userId: request.userId,
          provider,
          model: candidateModel,
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
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("LLM request timeout")), LLM_TIMEOUT_MS)
        ),
      ]);

      return normalizeAssistantAction(output);
    } catch (error) {
      lastError = error;

      logWarn("assistant.provider.openrouter-model-attempt-failed", {
        provider,
        model: candidateModel,
        userId: request.userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logWarn("assistant.provider.openrouter-fallback-heuristics", {
    provider,
    model,
    userId: request.userId,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  });

  return parseAssistantIntentHeuristically(request.input, request.context);
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
      confidence: normalizeConfidence(value.confidence),
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

  if (value.type === ASSISTANT_ACTION_TYPE.UPDATE_REMINDER) {
    const updates = value.reminderUpdates as Record<string, unknown> | undefined;

    return {
      type: ASSISTANT_ACTION_TYPE.UPDATE_REMINDER,
      confidence: normalizeConfidence(value.confidence),
      reminderId: String(value.reminderId ?? ""),
      updates: {
        title: typeof updates?.title === "string" ? updates.title : undefined,
        description: typeof updates?.description === "string" ? updates.description : undefined,
        priority: typeof updates?.priority === "string" ? updates.priority as ReminderPriority : undefined,
        dueAt: typeof updates?.dueAt === "string" && updates.dueAt ? new Date(updates.dueAt) : undefined,
      },
    };
  }

  if (value.type === ASSISTANT_ACTION_TYPE.CREATE_NOTE) {
    const note = value.note as Record<string, unknown> | undefined;

    return {
      type: ASSISTANT_ACTION_TYPE.CREATE_NOTE,
      confidence: normalizeConfidence(value.confidence),
      alsoCreateMemory: Boolean(value.alsoCreateMemory),
      note: {
        title: String(note?.title ?? ""),
        content: String(note?.content ?? ""),
        tags: Array.isArray(note?.tags) ? note.tags.map((item) => String(item)) : undefined,
      },
    };
  }

  if (value.type === ASSISTANT_ACTION_TYPE.UPDATE_NOTE) {
    const updates = value.noteUpdates as Record<string, unknown> | undefined;

    return {
      type: ASSISTANT_ACTION_TYPE.UPDATE_NOTE,
      confidence: normalizeConfidence(value.confidence),
      noteId: String(value.noteId ?? ""),
      updates: {
        title: typeof updates?.title === "string" ? updates.title : undefined,
        content: typeof updates?.content === "string" ? updates.content : undefined,
        tags: Array.isArray(updates?.tags) ? updates.tags.map((item) => String(item)) : undefined,
      },
    };
  }

  if (value.type === ASSISTANT_ACTION_TYPE.UPDATE_TIMETABLE_ENTRY) {
    const updates = value.updates as Record<string, unknown> | undefined;

    return {
      type: ASSISTANT_ACTION_TYPE.UPDATE_TIMETABLE_ENTRY,
      confidence: normalizeConfidence(value.confidence),
      entryId: String(value.entryId ?? ""),
      updates: {
        subject: typeof updates?.subject === "string" ? updates.subject : undefined,
        startTime: typeof updates?.startTime === "string" ? updates.startTime : undefined,
        endTime: typeof updates?.endTime === "string" ? updates.endTime : undefined,
        location: typeof updates?.location === "string" ? updates.location : undefined,
        lecturer: typeof updates?.lecturer === "string" ? updates.lecturer : undefined,
      },
    };
  }

  if (value.type === ASSISTANT_ACTION_TYPE.DELETE_ENTITY) {
    return {
      type: ASSISTANT_ACTION_TYPE.DELETE_ENTITY,
      confidence: normalizeConfidence(value.confidence),
      entityType: String(value.entityType ?? "REMINDER") as "REMINDER" | "NOTE" | "TIMETABLE_ENTRY",
      entityId: String(value.entityId ?? ""),
      requiresConfirmation: Boolean(value.requiresConfirmation ?? true),
    };
  }

  if (value.type === ASSISTANT_ACTION_TYPE.SEARCH_MEMORY) {
    const answer = value.answer as Record<string, unknown> | undefined;
    const timeContext = value.timeContext as Record<string, unknown> | undefined;
    const timeRange = timeContext?.timeRange as Record<string, unknown> | undefined;

    return {
      type: ASSISTANT_ACTION_TYPE.SEARCH_MEMORY,
      query: String(value.query ?? ""),
      target: String(value.target ?? "ALL") as "SCHEDULE" | "MEMORY" | "REMINDERS" | "NOTES" | "ALL",
      timeContext: timeContext ? {
        date: typeof timeContext.date === "string" ? new Date(timeContext.date) : undefined,
        dayOfWeek: typeof timeContext.dayOfWeek === "number" ? timeContext.dayOfWeek : undefined,
        timeRange: timeRange ? {
          start: String(timeRange.start ?? ""),
          end: String(timeRange.end ?? ""),
        } : undefined,
      } : undefined,
      answer: answer ? {
        summary: String(answer.summary ?? ""),
        evidence: Array.isArray(answer.evidence) ? answer.evidence.map((item) => String(item)) : [],
        sources: Array.isArray(answer.sources)
          ? answer.sources.map((s: unknown) => {
              const src = s as Record<string, unknown>;
              return {
                type: String(src.type ?? ""),
                id: String(src.id ?? ""),
                title: String(src.title ?? ""),
              };
            })
          : undefined,
      } : undefined,
    };
  }

  if (value.type === ASSISTANT_ACTION_TYPE.DISAMBIGUATE) {
    const options = value.options as Array<Record<string, unknown>> | undefined;

    return {
      type: ASSISTANT_ACTION_TYPE.DISAMBIGUATE,
      options: Array.isArray(options)
        ? options.map((opt) => ({
            label: String(opt.label ?? ""),
            action: opt.action as AssistantAction,
            description: String(opt.description ?? ""),
          }))
        : [],
      defaultOption: typeof value.defaultOption === "number" ? value.defaultOption : 0,
    };
  }

  if (value.type === ASSISTANT_ACTION_TYPE.ANSWER_QUESTION) {
    const answer = value.answer as Record<string, unknown> | undefined;

    return {
      type: ASSISTANT_ACTION_TYPE.ANSWER_QUESTION,
      answer: {
        summary: String(answer?.summary ?? ""),
        evidence: Array.isArray(answer?.evidence) ? answer.evidence.map((item) => String(item)) : [],
        sources: Array.isArray(answer?.sources)
          ? answer.sources.map((s: unknown) => {
              const src = s as Record<string, unknown>;
              return {
                type: String(src.type ?? ""),
                id: String(src.id ?? ""),
                title: String(src.title ?? ""),
              };
            })
          : undefined,
      },
    };
  }

  if (value.type === ASSISTANT_ACTION_TYPE.CREATE_TIMETABLE_ENTRY) {
    const timetableEntry = value.timetableEntry as Record<string, unknown> | undefined;

    return {
      type: ASSISTANT_ACTION_TYPE.CREATE_TIMETABLE_ENTRY,
      confidence: normalizeConfidence(value.confidence),
      timetableEntry: {
        subject: String(timetableEntry?.subject ?? ""),
        location: typeof timetableEntry?.location === "string" ? timetableEntry.location : undefined,
        lecturer: typeof timetableEntry?.lecturer === "string" ? timetableEntry.lecturer : undefined,
        dayOfWeek: typeof timetableEntry?.dayOfWeek === "number" ? Number(timetableEntry.dayOfWeek) : undefined,
        startTime: typeof timetableEntry?.startTime === "string" ? timetableEntry.startTime : undefined,
        endTime: typeof timetableEntry?.endTime === "string" ? timetableEntry.endTime : undefined,
        semesterStart:
          typeof timetableEntry?.semesterStart === "string" && timetableEntry.semesterStart
            ? new Date(timetableEntry.semesterStart)
            : undefined,
        semesterEnd:
          typeof timetableEntry?.semesterEnd === "string" && timetableEntry.semesterEnd
            ? new Date(timetableEntry.semesterEnd)
            : undefined,
        reminderLeadMinutes:
          typeof timetableEntry?.reminderLeadMinutes === "number"
            ? Number(timetableEntry.reminderLeadMinutes)
            : undefined,
      },
    };
  }

  if (value.type === ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS) {
    const clarification = value.clarification as Record<string, unknown> | undefined;
    const normalizedMissingFields = Array.isArray(clarification?.missingFields)
      ? clarification.missingFields
          .map((item) => String(item).trim())
          .filter((item) => item.length > 0)
          .filter((item, index, all) => all.indexOf(item) === index)
          .slice(0, 6)
      : [];
    const normalizedQuestion = String(clarification?.question ?? "Can you clarify what you want to do?")
      .trim()
      .slice(0, 300);

    return {
      type: ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS,
      clarification: {
        missingFields: normalizedMissingFields.length > 0 ? normalizedMissingFields : ["intent"],
        question: normalizedQuestion || "Can you clarify what you want to do?",
      },
    };
  }

  return {
    type: ASSISTANT_ACTION_TYPE.REJECT_REQUEST,
    reason: String(value.reason ?? "I could not process that request."),
  };
}

function normalizeConfidence(value: unknown): "high" | "medium" | "low" {
  if (value === "low") return "low";
  if (value === "medium") return "medium";
  return "high";
}
