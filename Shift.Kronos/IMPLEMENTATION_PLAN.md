# Shift.Kronos: Natural Language & Voice Overhaul

**Comprehensive Implementation Plan**

Version: 1.0  
Date: April 2026  
Status: Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Target State](#target-state)
4. [Phase 1: Schema & Types](#phase-1-schema--types)
5. [Phase 2: LLM Intent Classification](#phase-2-llm-intent-classification)
6. [Phase 3: Memory Integration](#phase-3-memory-integration)
7. [Phase 4: Query & Question Handling](#phase-4-query--question-handling)
8. [Phase 5: Voice UI Redesign](#phase-5-voice-ui-redesign)
9. [Phase 6: Timetable Intelligence](#phase-6-timetable-intelligence)
10. [Phase 7: Error Handling & Edge Cases](#phase-7-error-handling--edge-cases)
11. [File Changes Summary](#file-changes-summary)
12. [Testing Strategy](#testing-strategy)
13. [Rollout Plan](#rollout-plan)

---

## Executive Summary

### Problem Statement

Shift.Kronos currently has brittle natural language understanding that fails on common user inputs:

- **Exact phrase matching**: Only recognizes "remind me to...", "add reminder...", etc.
- **No note creation via NL**: "Note that I need to make breakfast" routes to query instead of creation
- **Broken query handling**: "What class do I have tomorrow?" asks for creation instead of answering
- **No memory recall**: Cannot answer "What did I say about...?"
- **Voice UI limitations**: Toast-only feedback, no transcript visibility, no TTS responses

### Solution Overview

Transform Shift.Kronos into a fully LLM-powered intelligent assistant:

1. **Full LLM intent classification** - Remove brittle heuristics, use AI for all intent parsing
2. **Dual-write memory system** - Every entity creation also stored in memory for recall
3. **Smart inference engine** - Auto-resolve times, entity types, semester ranges from context
4. **Voice popup modal** - Hold-to-speak with live transcript, brief TTS responses
5. **Voice response toggle** - User can disable TTS in settings

### Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Intent classification accuracy | ~40% | ~95% |
| User inputs requiring clarification | ~60% | ~15% |
| Memory recall success rate | 0% | ~90% |
| Voice interaction satisfaction | N/A | Baseline established |

---

## Current State Analysis

### Architecture Overview

```
User Input → Quick Add Bar / Voice FAB
    ↓
runAssistantWorkflow() (lib/assistant/service.ts)
    ↓
┌─────────────────────────────────────────────┐
│  PHASE4_FAKE_AI === "1" (default in preview)│
│    ↓                                        │
│  parseAssistantIntentHeuristically()       │  ← BRITTLE RULES
│                                             │
│  ELSE:                                      │
│  OpenRouter API call with JSON schema      │  ← LLM (rarely used)
└─────────────────────────────────────────────┘
    ↓
Action Execution
```

### Key Files

| File | Purpose | Issues |
|------|---------|--------|
| `lib/ai/heuristics.ts` | Rule-based intent parsing | Only recognizes exact phrases |
| `lib/assistant/service.ts` | Workflow orchestration | Defaults to heuristics |
| `lib/assistant/context.ts` | Context assembly | Good foundation |
| `lib/ai/providers/text.ts` | LLM integration | Prompts need expansion |
| `lib/memory/service.ts` | Memory summarization | No entity linking |
| `components/capture/voice-fab.tsx` | Voice input | Toast-only, no modal |
| `prisma/schema.prisma` | Database schema | Missing voice toggle |

### Failure Scenarios

| User Input | Current Behavior | Expected Behavior |
|------------|------------------|-------------------|
| "Note that I need to make breakfast" | Routes to query → "No relevant note found" | Create Note entity + memory entry |
| "Add a reminder to pick up shoes at 8am" | Asks "Create reminder or timetable?" | Create reminder at next 8am |
| "What class do I have tomorrow at 8am?" | Asks "What time does this class end?" | Query timetable, return class |
| "What did I say about breakfast?" | "No relevant memory found" | Search memory artifacts, return answer |
| "My Monday 8am class changed to Chemistry" | Not recognized | Update timetable entry |

---

## Target State

### New Architecture

```
User Input → Quick Add Bar / Voice Modal
    ↓
runAssistantWorkflow()
    ↓
getAssistantContextForUser()  ← Enhanced context (reminders, classes, memory, notes)
    ↓
generateStructuredAssistantAction()  ← ALWAYS LLM
    ↓
┌─────────────────────────────────────────────────────┐
│  LLM Decision with:                                 │
│  - Entity type inference (reminder/note/timetable) │
│  - Time inference (next occurrence)                │
│  - Semester inference (from existing entries)      │
│  - Query vs creation detection                     │
└─────────────────────────────────────────────────────┘
    ↓
Action Execution
    ↓
Dual-Write: Entity + Memory Artifact (if creation)
    ↓
Response with suggested actions
```

### User Experience Goals

1. **Natural phrasing**: "I have a meeting at 3pm" just works
2. **Smart defaults**: Missing details inferred from context
3. **Memory recall**: "What did I say about X?" returns actual information
4. **Voice conversation**: Hold button, see transcript, hear brief response
5. **Seamless fallback**: Unclear inputs create best-guess with alternatives

---

## Phase 1: Schema & Types

### 1.1 Database Schema Changes

**File**: `prisma/schema.prisma`

#### Add to User model:

```prisma
model User {
  // ... existing fields (lines 72-92)
  
  voiceResponseEnabled Boolean @default(true)  // TTS toggle for voice responses
}
```

#### Add to MemoryArtifact model:

```prisma
model MemoryArtifact {
  // ... existing fields
  
  relatedEntityId String?   // Link to source entity (reminder, note, timetable entry)
  entityType      String?   // "REMINDER" | "NOTE" | "TIMETABLE_ENTRY" | "CONVERSATION"
}
```

#### Migration:

```bash
npx prisma migrate dev --name add_voice_toggle_and_memory_entity_linking
```

### 1.2 Action Types Extension

**File**: `lib/assistant/types.ts`

```typescript
export const ASSISTANT_ACTION_TYPE = {
  // Existing
  CREATE_REMINDER: "CREATE_REMINDER",
  CREATE_TIMETABLE_ENTRY: "CREATE_TIMETABLE_ENTRY",
  CLARIFY_MISSING_FIELDS: "CLARIFY_MISSING_FIELDS",
  REJECT_REQUEST: "REJECT_REQUEST",
  
  // NEW
  CREATE_NOTE: "CREATE_NOTE",
  UPDATE_TIMETABLE_ENTRY: "UPDATE_TIMETABLE_ENTRY",
  DELETE_ENTITY: "DELETE_ENTITY",
  SEARCH_MEMORY: "SEARCH_MEMORY",     // Replaces ANSWER_QUESTION
  DISAMBIGUATE: "DISAMBIGUATE",
} as const;

export type QueryTarget = 
  | "SCHEDULE"    // Timetable + reminders with due dates
  | "MEMORY"      // Conversation memory + notes
  | "REMINDERS"   // Active reminders only
  | "NOTES"       // Notes and files
  | "ALL";        // Comprehensive search

export type EntityType = "REMINDER" | "NOTE" | "TIMETABLE_ENTRY" | "CONVERSATION";

// Extended action types
export interface CreateNoteAction {
  type: typeof ASSISTANT_ACTION_TYPE.CREATE_NOTE;
  confidence: "high" | "medium" | "low";
  note: {
    title: string;
    content: string;
    tags?: string[];
  };
  alsoCreateMemory: boolean;
}

export interface UpdateTimetableEntryAction {
  type: typeof ASSISTANT_ACTION_TYPE.UPDATE_TIMETABLE_ENTRY;
  confidence: "high" | "medium" | "low";
  entryId: string;  // ID of entry to update
  updates: {
    subject?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    lecturer?: string;
  };
}

export interface DeleteEntityAction {
  type: typeof ASSISTANT_ACTION_TYPE.DELETE_ENTITY;
  confidence: "high" | "medium" | "low";
  entityType: EntityType;
  entityId: string;
  requiresConfirmation: boolean;
}

export interface SearchMemoryAction {
  type: typeof ASSISTANT_ACTION_TYPE.SEARCH_MEMORY;
  query: string;
  target: QueryTarget;
  timeContext?: {
    date?: Date;
    dayOfWeek?: number;
    timeRange?: { start: string; end: string };
  };
  suggestedActions?: AssistantAction[];
}

export interface DisambiguateAction {
  type: typeof ASSISTANT_ACTION_TYPE.DISAMBIGUATE;
  options: Array<{
    label: string;
    action: AssistantAction;
    description: string;
  }>;
  defaultOption: number;
}
```

### 1.3 Environment Variables

**File**: `lib/env.ts`

```typescript
// Add to serverEnvSchema:
GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1).optional(),

// For local development, this should point to:
// gen-lang-client-0783002568-ad165865b71e.json
// or set GOOGLE_APPLICATION_CREDENTIALS env var to the file path
```

### 1.4 TTS Provider Configuration

**File**: `lib/ai/preferences.ts`

```typescript
export const TTS_PROVIDER = {
  GOOGLE_CLOUD: "google_cloud",
} as const;

export const TTS_VOICE_OPTIONS = {
  // Neural2 voices are FREE tier compatible (1M chars/month)
  // DO NOT use Gemini TTS models (billed per token)
  [TTS_PROVIDER.GOOGLE_CLOUD]: {
    defaultVoice: "en-US-Neural2-F",
    availableVoices: [
      { id: "en-US-Neural2-F", label: "Female (Neural)", gender: "female" },
      { id: "en-US-Neural2-D", label: "Male (Neural)", gender: "male" },
      { id: "en-US-Neural2-C", label: "Female Alt (Neural)", gender: "female" },
    ],
    audioEncoding: "MP3",
    speakingRate: 1.0,  // Normal speed
    pitch: 0,           // Normal pitch
  },
} as const;

export type TtsProvider = (typeof TTS_PROVIDER)[keyof typeof TTS_PROVIDER];

export function resolveTtsProvider(user: Pick<User, "ttsProvider"> | null): TtsProvider {
  return TTS_PROVIDER.GOOGLE_CLOUD;  // Only option for now
}

export function resolveTtsVoice(user: Pick<User, "ttsVoice"> | null): string {
  return user?.ttsVoice || TTS_VOICE_OPTIONS[TTS_PROVIDER.GOOGLE_CLOUD].defaultVoice;
}

export function resolveVoiceResponseEnabled(user: Pick<User, "voiceResponseEnabled"> | null): boolean {
  return user?.voiceResponseEnabled ?? true;
}
```

---

## Phase 2: LLM Intent Classification

### 2.1 Remove Heuristics Default

**File**: `lib/assistant/service.ts`

**Current behavior** (lines ~403-405):
```typescript
if (env.PHASE4_FAKE_AI === "1") {
  return parseAssistantIntentHeuristically(request.input, request.context);
}
```

**New behavior**:
```typescript
// ALWAYS use LLM for intent classification
// Heuristics only for timeout/error fallback
try {
  const result = await generateStructuredAssistantAction(request, context);
  return result;
} catch (error) {
  // Fallback to heuristics only on LLM failure
  logWarn("assistant.llm-fallback", { error, input: request.input });
  return parseAssistantIntentHeuristically(request.input, request.context);
}
```

### 2.2 Enhanced System Prompt

**File**: `lib/ai/providers/text.ts`

**New system prompt**:

```typescript
const ASSISTANT_SYSTEM_PROMPT = `You are Shift:Kronos, an intelligent personal assistant that helps users manage reminders, notes, timetable entries, and memory.

## CRITICAL RULES

1. OUTPUT FORMAT: Return ONLY valid JSON matching the schema. No markdown, no code fences, no commentary.

2. DETERMINISTIC BOUNDARY: You must stay deterministic at the mutation boundary. Never invent details not provided by the user.

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
| "what class do I have..." | SEARCH_MEMORY | Query, not creation |
| "what did I say about..." | SEARCH_MEMORY | Memory recall query |

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
- Maintain conversation continuity`;
```

### 2.3 Expanded JSON Schema

**File**: `lib/ai/providers/text.ts`

```typescript
const ASSISTANT_ACTION_SCHEMA = {
  type: "object",
  required: ["type"],
  additionalProperties: false,
  properties: {
    type: {
      type: "string",
      enum: [
        "CREATE_REMINDER",
        "CREATE_NOTE",
        "CREATE_TIMETABLE_ENTRY",
        "UPDATE_TIMETABLE_ENTRY",
        "DELETE_ENTITY",
        "SEARCH_MEMORY",
        "DISAMBIGUATE",
        "CLARIFY_MISSING_FIELDS",
        "REJECT_REQUEST",
      ],
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
    },
    
    // CREATE_REMINDER
    reminder: {
      type: "object",
      properties: {
        title: { type: "string", maxLength: 160 },
        description: { type: "string" },
        type: { type: "string", enum: ["ONE_TIME", "RECURRING", "INBOX"] },
        priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
        category: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        dueAt: { type: "string", format: "date-time" },
        recurrence: {
          type: "object",
          properties: {
            frequency: { type: "string", enum: ["DAILY", "WEEKLY", "MONTHLY"] },
            interval: { type: "integer" },
            daysOfWeek: { type: "array", items: { type: "integer" } },
          },
        },
      },
      required: ["title", "type"],
    },
    
    // CREATE_NOTE
    note: {
      type: "object",
      properties: {
        title: { type: "string", maxLength: 160 },
        content: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["title", "content"],
    },
    alsoCreateMemory: { type: "boolean" },
    
    // CREATE_TIMETABLE_ENTRY
    timetableEntry: {
      type: "object",
      properties: {
        subject: { type: "string", maxLength: 160 },
        dayOfWeek: { type: "integer", minimum: 1, maximum: 7 },
        startTime: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
        endTime: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
        location: { type: "string" },
        lecturer: { type: "string" },
        semesterStart: { type: "string", format: "date-time" },
        semesterEnd: { type: "string", format: "date-time" },
      },
      required: ["subject", "dayOfWeek", "startTime", "endTime"],
    },
    
    // UPDATE_TIMETABLE_ENTRY
    entryId: { type: "string" },
    updates: {
      type: "object",
      properties: {
        subject: { type: "string" },
        startTime: { type: "string" },
        endTime: { type: "string" },
        location: { type: "string" },
        lecturer: { type: "string" },
      },
    },
    
    // DELETE_ENTITY
    entityType: { type: "string", enum: ["REMINDER", "NOTE", "TIMETABLE_ENTRY"] },
    entityId: { type: "string" },
    requiresConfirmation: { type: "boolean" },
    
    // SEARCH_MEMORY
    query: { type: "string" },
    target: { type: "string", enum: ["SCHEDULE", "MEMORY", "REMINDERS", "NOTES", "ALL"] },
    timeContext: {
      type: "object",
      properties: {
        date: { type: "string", format: "date" },
        dayOfWeek: { type: "integer" },
        timeRange: {
          type: "object",
          properties: {
            start: { type: "string" },
            end: { type: "string" },
          },
        },
      },
    },
    suggestedActions: {
      type: "array",
      items: { type: "object" },
    },
    
    // DISAMBIGUATE
    options: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          action: { type: "object" },
          description: { type: "string" },
        },
      },
    },
    defaultOption: { type: "integer" },
    
    // CLARIFY_MISSING_FIELDS
    clarification: {
      type: "object",
      properties: {
        missingFields: { type: "array", items: { type: "string" } },
        question: { type: "string" },
      },
    },
    
    // SEARCH_MEMORY response
    answer: {
      type: "object",
      properties: {
        summary: { type: "string" },
        evidence: { type: "array", items: { type: "string" } },
        sources: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              id: { type: "string" },
              title: { type: "string" },
            },
          },
        },
      },
    },
    
    // REJECT_REQUEST
    reason: { type: "string" },
  },
  allOf: [
    // Conditional requirements based on type
    {
      if: { properties: { type: { const: "CREATE_REMINDER" } } },
      then: { required: ["confidence", "reminder"] },
    },
    {
      if: { properties: { type: { const: "CREATE_NOTE" } } },
      then: { required: ["confidence", "note", "alsoCreateMemory"] },
    },
    {
      if: { properties: { type: { const: "CREATE_TIMETABLE_ENTRY" } } },
      then: { required: ["confidence", "timetableEntry"] },
    },
    {
      if: { properties: { type: { const: "UPDATE_TIMETABLE_ENTRY" } } },
      then: { required: ["confidence", "entryId", "updates"] },
    },
    {
      if: { properties: { type: { const: "DELETE_ENTITY" } } },
      then: { required: ["confidence", "entityType", "entityId", "requiresConfirmation"] },
    },
    {
      if: { properties: { type: { const: "SEARCH_MEMORY" } } },
      then: { required: ["query", "target"] },
    },
    {
      if: { properties: { type: { const: "DISAMBIGUATE" } } },
      then: { required: ["options", "defaultOption"] },
    },
    {
      if: { properties: { type: { const: "CLARIFY_MISSING_FIELDS" } } },
      then: { required: ["clarification"] },
    },
    {
      if: { properties: { type: { const: "REJECT_REQUEST" } } },
      then: { required: ["reason"] },
    },
  ],
};
```

### 2.4 Few-Shot Examples

Add to the prompt:

```typescript
const FEW_SHOT_EXAMPLES = `
## EXAMPLES

### Example 1: One-time reminder
Input: "I have a meeting at 3pm"
Context: { now: "2024-04-08T13:00:00Z" }
Output: {
  "type": "CREATE_REMINDER",
  "confidence": "high",
  "reminder": {
    "title": "Meeting",
    "type": "ONE_TIME",
    "priority": "MEDIUM",
    "dueAt": "2024-04-08T15:00:00Z"
  }
}

### Example 2: Note with memory
Input: "Note that I need to make breakfast in the morning"
Context: { now: "2024-04-08T20:00:00Z" }
Output: {
  "type": "CREATE_NOTE",
  "confidence": "high",
  "note": {
    "title": "Morning breakfast routine",
    "content": "I need to make breakfast in the morning",
    "tags": ["routine", "morning"]
  },
  "alsoCreateMemory": true
}

### Example 3: Timetable query
Input: "What class do I have tomorrow at 8am?"
Context: {
  now: "2024-04-08T10:00:00Z",
  upcomingClasses: [{ subject: "Business Communications", dayOfWeek: 2, startTime: "08:00", ... }]
}
Output: {
  "type": "SEARCH_MEMORY",
  "query": "class tomorrow 8am",
  "target": "SCHEDULE",
  "timeContext": { "date": "2024-04-09", "timeRange": { "start": "08:00", "end": "09:00" } },
  "suggestedActions": [
    { "type": "CREATE_REMINDER", "reminder": { "title": "Prepare for Business Communications" } }
  ]
}

### Example 4: Timetable update
Input: "My Monday 8am class changed from Biology to Chemistry"
Context: {
  timetableEntries: [{ id: "abc123", subject: "Biology", dayOfWeek: 1, startTime: "08:00", ... }]
}
Output: {
  "type": "UPDATE_TIMETABLE_ENTRY",
  "confidence": "high",
  "entryId": "abc123",
  "updates": { "subject": "Chemistry" }
}

### Example 5: Ambiguous input with best guess
Input: "Add a reminder to pick up my shoes at 8am"
Context: { now: "2024-04-08T10:00:00Z" }
Output: {
  "type": "CREATE_REMINDER",
  "confidence": "high",
  "reminder": {
    "title": "Pick up my shoes",
    "type": "ONE_TIME",
    "priority": "MEDIUM",
    "dueAt": "2024-04-09T08:00:00Z"
  }
}
Note: No clarification needed - 8am has passed today, so tomorrow is implied.

### Example 6: Memory recall
Input: "What did I say about breakfast?"
Context: {
  memoryHighlights: [{ content: "User wants to make breakfast in the morning", salientFacts: ["Morning breakfast routine"] }]
}
Output: {
  "type": "SEARCH_MEMORY",
  "query": "breakfast",
  "target": "MEMORY",
  "answer": {
    "summary": "You mentioned wanting to make breakfast in the morning.",
    "evidence": ["Memory: Morning breakfast routine"],
    "sources": [{ "type": "MEMORY", "id": "mem123", "title": "Morning routine" }]
  }
}
`;
```

---

## Phase 3: Memory Integration

### 3.1 Dual-Write Pattern

**Goal**: Every entity creation also stores in memory for later recall.

**File**: `lib/memory/dual-write.ts` (NEW)

```typescript
import { prisma } from "@/lib/db";
import { EntityType } from "@/lib/assistant/types";
import { generateStructuredMemorySummary } from "@/lib/ai/providers/text";

interface DualWriteParams {
  userId: string;
  entityType: EntityType;
  entityId: string;
  entityTitle: string;
  entityContent: string;
  conversationId?: string;
}

/**
 * Creates a memory artifact linked to a source entity.
 * Called after every entity creation (reminder, note, timetable entry).
 */
export async function createMemoryForEntity({
  userId,
  entityType,
  entityId,
  entityTitle,
  entityContent,
  conversationId,
}: DualWriteParams) {
  // Create memory artifact with structured data
  const memoryArtifact = await prisma.memoryArtifact.create({
    data: {
      userId,
      kind: "ENTITY_SNAPSHOT",
      title: `${entityType}: ${entityTitle}`,
      content: entityContent,
      summaryLevel: 0, // Level 0 = raw entity snapshot
      structuredData: {
        salientFacts: extractSalientFacts(entityContent, entityTitle),
        openLoops: [],
        keywords: extractKeywords(entityTitle, entityContent),
      },
      relatedEntityId: entityId,
      entityType,
      conversationId,
    },
  });

  // Index for semantic retrieval
  await indexMemoryArtifact(memoryArtifact);

  return memoryArtifact;
}

function extractSalientFacts(content: string, title: string): string[] {
  // Extract key facts from the content
  // For now, simple extraction - can be enhanced with LLM
  const facts: string[] = [];
  
  // Title as primary fact
  facts.push(title);
  
  // Extract time-based facts
  const timeMatch = content.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)\b/i);
  if (timeMatch) {
    facts.push(`Time reference: ${timeMatch[1]}`);
  }
  
  return facts;
}

function extractKeywords(title: string, content: string): string[] {
  // Combine title and content, extract meaningful keywords
  const text = `${title} ${content}`.toLowerCase();
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "dare", "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "and", "but", "if", "or", "because", "until", "while", "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers", "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves", "what", "which", "who", "whom", "this", "that", "these", "those", "am"]);
  
  const words = text.match(/\b[a-z]{3,}\b/g) || [];
  const filtered = words.filter(w => !stopWords.has(w));
  
  // Return unique keywords, limited to 10
  return [...new Set(filtered)].slice(0, 10);
}

async function indexMemoryArtifact(artifact: {
  id: string;
  userId: string;
  content: string;
  title: string | null;
}) {
  // Use existing retrieval indexing
  const { indexContent } = await import("@/lib/retrieval/service");
  
  await indexContent({
    userId: artifact.userId,
    sourceType: "MEMORY",
    sourceId: artifact.id,
    content: `${artifact.title || ""} ${artifact.content}`,
    metadata: {
      artifactId: artifact.id,
    },
  });
}
```

### 3.2 Integrate with Entity Creation

**File**: `lib/assistant/service.ts`

```typescript
// After creating reminder
async function executeCreateReminder(action: CreateReminderAction, userId: string) {
  const reminder = await prisma.reminder.create({
    data: {
      userId,
      title: action.reminder.title,
      description: action.reminder.description,
      type: action.reminder.type,
      // ... other fields
    },
  });

  // NEW: Dual-write to memory
  await createMemoryForEntity({
    userId,
    entityType: "REMINDER",
    entityId: reminder.id,
    entityTitle: reminder.title,
    entityContent: `${reminder.title}${reminder.description ? ` - ${reminder.description}` : ""}`,
    conversationId: context.conversationId,
  });

  return reminder;
}

// After creating note
async function executeCreateNote(action: CreateNoteAction, userId: string) {
  const note = await prisma.note.create({
    data: {
      userId,
      title: action.note.title,
      content: action.note.content,
      tags: action.note.tags || [],
    },
  });

  // Always create memory for notes if specified
  if (action.alsoCreateMemory) {
    await createMemoryForEntity({
      userId,
      entityType: "NOTE",
      entityId: note.id,
      entityTitle: note.title,
      entityContent: note.content,
      conversationId: context.conversationId,
    });
  }

  return note;
}

// After creating timetable entry
async function executeCreateTimetableEntry(action: CreateTimetableEntryAction, userId: string) {
  const entry = await prisma.timetableEntry.create({
    data: {
      userId,
      subject: action.timetableEntry.subject,
      dayOfWeek: action.timetableEntry.dayOfWeek,
      startTime: action.timetableEntry.startTime,
      endTime: action.timetableEntry.endTime,
      // ... other fields
    },
  });

  // NEW: Dual-write to memory
  await createMemoryForEntity({
    userId,
    entityType: "TIMETABLE_ENTRY",
    entityId: entry.id,
    entityTitle: entry.subject,
    entityContent: `${entry.subject} on ${getDayName(entry.dayOfWeek)} from ${entry.startTime} to ${entry.endTime}${entry.location ? ` at ${entry.location}` : ""}`,
    conversationId: context.conversationId,
  });

  return entry;
}
```

### 3.3 Enhanced Context Building

**File**: `lib/assistant/context.ts`

```typescript
export async function getAssistantContextForUser(
  userId: string,
  query?: string | null,
): Promise<AssistantContext> {
  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });

  const timezone = user?.timezone ?? "UTC";

  // Existing: Active reminders
  const activeReminders = await prisma.reminder.findMany({
    where: {
      userId,
      status: "ACTIVE",
      dueAt: { gte: now },
    },
    orderBy: { dueAt: "asc" },
    take: 12,
  });

  // Existing: Upcoming classes
  const upcomingClasses = await getUpcomingClassOccurrences(userId, now);

  // ENHANCED: Semantic retrieval from multiple sources
  const knowledgeHighlights = query
    ? await retrieveRelevantContent(userId, query, {
        sources: ["NOTE", "FILE"],
        limit: 5,
      })
    : [];

  // ENHANCED: Memory artifact retrieval
  const memoryHighlights = query
    ? await retrieveRelevantContent(userId, query, {
        sources: ["MEMORY"],
        limit: 5,
      })
    : [];

  // NEW: Recent memory artifacts for context
  const recentMemoryArtifacts = await prisma.memoryArtifact.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      title: true,
      content: true,
      structuredData: true,
      entityType: true,
      relatedEntityId: true,
      createdAt: true,
    },
  });

  // NEW: All timetable entries for semester inference
  const timetableEntries = await prisma.timetableEntry.findMany({
    where: { userId },
    select: {
      id: true,
      subject: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      semesterStart: true,
      semesterEnd: true,
    },
  });

  // Extract semester context from existing entries
  const semesterContext = extractSemesterContext(timetableEntries);

  return {
    timezone,
    now,
    activeReminders: activeReminders.map(formatReminderForContext),
    upcomingClasses,
    knowledgeHighlights,
    memoryHighlights,
    recentMemoryArtifacts: recentMemoryArtifacts.map(formatMemoryForContext),
    timetableEntries: timetableEntries.map(formatTimetableForContext),
    semesterContext,
  };
}

function extractSemesterContext(entries: TimetableEntry[]): { semesterStart?: Date; semesterEnd?: Date } | null {
  if (entries.length === 0) return null;

  // Find the most common semester range
  const ranges = entries
    .filter(e => e.semesterStart && e.semesterEnd)
    .map(e => ({
      start: e.semesterStart!,
      end: e.semesterEnd!,
    }));

  if (ranges.length === 0) return null;

  // Use the first matching range (assuming all entries share semester)
  return {
    semesterStart: ranges[0].start,
    semesterEnd: ranges[0].end,
  };
}

function formatMemoryForContext(artifact: any): MemoryContextItem {
  const structured = artifact.structuredData as { salientFacts?: string[]; keywords?: string[] } | null;
  
  return {
    id: artifact.id,
    title: artifact.title,
    content: artifact.content.slice(0, 200),
    salientFacts: structured?.salientFacts || [],
    keywords: structured?.keywords || [],
    entityType: artifact.entityType,
    relatedEntityId: artifact.relatedEntityId,
    createdAt: artifact.createdAt,
  };
}
```

### 3.4 Memory Types

**File**: `lib/memory/types.ts` (NEW)

```typescript
export type MemoryKind = 
  | "ENTITY_SNAPSHOT"    // Raw entity at creation time
  | "CONVERSATION_SUMMARY"  // Summarized conversation
  | "KNOWLEDGE_EXTRACTION"  // Extracted knowledge from notes/files
  | "USER_PREFERENCE";      // Learned user preferences

export interface MemoryContextItem {
  id: string;
  title: string | null;
  content: string;
  salientFacts: string[];
  keywords: string[];
  entityType: string | null;
  relatedEntityId: string | null;
  createdAt: Date;
}

export interface SemesterContext {
  semesterStart?: Date;
  semesterEnd?: Date;
}
```

---

## Phase 4: Query & Question Handling

### 4.1 Search Memory Action

**File**: `lib/assistant/queries.ts` (NEW)

```typescript
import { prisma } from "@/lib/db";
import { QueryTarget, AssistantAction, ASSISTANT_ACTION_TYPE } from "./types";
import { retrieveRelevantContent } from "@/lib/retrieval/service";
import { getDayName, formatDate, formatTime } from "@/lib/datetime";

interface SearchParams {
  userId: string;
  query: string;
  target: QueryTarget;
  timeContext?: {
    date?: Date;
    dayOfWeek?: number;
    timeRange?: { start: string; end: string };
  };
}

interface SearchResult {
  summary: string;
  evidence: string[];
  sources: Array<{
    type: string;
    id: string;
    title: string;
  }>;
  suggestedActions?: AssistantAction[];
}

export async function executeSearchMemory(params: SearchParams): Promise<SearchResult> {
  const { userId, query, target, timeContext } = params;

  switch (target) {
    case "SCHEDULE":
      return searchSchedule(userId, query, timeContext);
    case "MEMORY":
      return searchMemoryArtifacts(userId, query);
    case "REMINDERS":
      return searchReminders(userId, query, timeContext);
    case "NOTES":
      return searchNotes(userId, query);
    case "ALL":
      return searchAll(userId, query);
    default:
      return {
        summary: "I couldn't understand your query.",
        evidence: [],
        sources: [],
      };
  }
}

async function searchSchedule(
  userId: string,
  query: string,
  timeContext?: { date?: Date; dayOfWeek?: number; timeRange?: { start: string; end: string } },
): Promise<SearchResult> {
  const now = new Date();
  const evidence: string[] = [];
  const sources: SearchResult["sources"] = [];

  // Search timetable entries
  let timetableQuery: any = { userId };
  
  if (timeContext?.dayOfWeek) {
    timetableQuery.dayOfWeek = timeContext.dayOfWeek;
  }

  const timetableEntries = await prisma.timetableEntry.findMany({
    where: timetableQuery,
    orderBy: { startTime: "asc" },
  });

  // Filter by time if specified
  let matchingEntries = timetableEntries;
  if (timeContext?.timeRange) {
    const { start, end } = timeContext.timeRange;
    matchingEntries = timetableEntries.filter(entry => {
      const entryStart = entry.startTime;
      const entryEnd = entry.endTime;
      
      // Check if entry overlaps with queried time range
      return entryStart >= start && entryStart <= end;
    });
  }

  // Find next occurrence based on time context
  if (timeContext?.date) {
    const targetDate = timeContext.date;
    const dayOfWeek = targetDate.getDay() || 7; // Convert Sunday 0 to 7
    
    const entriesOnDay = matchingEntries.filter(e => e.dayOfWeek === dayOfWeek);
    
    if (entriesOnDay.length > 0) {
      entriesOnDay.forEach(entry => {
        evidence.push(`${entry.subject} at ${entry.startTime}${entry.location ? ` in ${entry.location}` : ""}`);
        sources.push({
          type: "TIMETABLE_ENTRY",
          id: entry.id,
          title: entry.subject,
        });
      });

      // Get first matching entry for summary
      const firstEntry = entriesOnDay[0];
      const formattedDate = formatDate(targetDate);
      
      return {
        summary: `On ${formattedDate}, you have ${firstEntry.subject} at ${firstEntry.startTime}${firstEntry.location ? ` in ${firstEntry.location}` : ""}.`,
        evidence,
        sources,
        suggestedActions: [
          {
            type: ASSISTANT_ACTION_TYPE.CREATE_REMINDER,
            confidence: "medium",
            reminder: {
              title: `Prepare for ${firstEntry.subject}`,
              type: "ONE_TIME",
            },
          } as AssistantAction,
        ],
      };
    }
  }

  // No specific date, show upcoming
  if (matchingEntries.length > 0) {
    matchingEntries.slice(0, 3).forEach(entry => {
      evidence.push(`${entry.subject} on ${getDayName(entry.dayOfWeek)} at ${entry.startTime}`);
      sources.push({
        type: "TIMETABLE_ENTRY",
        id: entry.id,
        title: entry.subject,
      });
    });

    return {
      summary: `Your next classes are: ${evidence.slice(0, 2).join(", ")}.`,
      evidence,
      sources,
    };
  }

  // No timetable matches, search reminders
  const reminders = await prisma.reminder.findMany({
    where: {
      userId,
      status: "ACTIVE",
      dueAt: timeContext?.date
        ? {
            gte: new Date(timeContext.date.setHours(0, 0, 0, 0)),
            lt: new Date(timeContext.date.setHours(23, 59, 59, 999)),
          }
        : { gte: now },
    },
    orderBy: { dueAt: "asc" },
    take: 5,
  });

  if (reminders.length > 0) {
    reminders.forEach(reminder => {
      evidence.push(`${reminder.title}${reminder.dueAt ? ` at ${formatTime(reminder.dueAt)}` : ""}`);
      sources.push({
        type: "REMINDER",
        id: reminder.id,
        title: reminder.title,
      });
    });

    return {
      summary: `You have ${reminders.length} reminder(s): ${evidence.join(", ")}.`,
      evidence,
      sources,
    };
  }

  return {
    summary: "You don't have any scheduled items matching that query.",
    evidence: [],
    sources: [],
  };
}

async function searchMemoryArtifacts(userId: string, query: string): Promise<SearchResult> {
  // Semantic search through memory artifacts
  const results = await retrieveRelevantContent(userId, query, {
    sources: ["MEMORY"],
    limit: 5,
  });

  if (results.length === 0) {
    // Fallback: Search structured data
    const memories = await prisma.memoryArtifact.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 5,
    });

    if (memories.length === 0) {
      return {
        summary: `I couldn't find any memory related to "${query}".`,
        evidence: [],
        sources: [],
      };
    }

    return {
      summary: `I found ${memories.length} memory item(s) related to "${query}".`,
      evidence: memories.map(m => m.content.slice(0, 150)),
      sources: memories.map(m => ({
        type: "MEMORY",
        id: m.id,
        title: m.title || "Memory",
      })),
    };
  }

  return {
    summary: `I found relevant memory about "${query}".`,
    evidence: results.map(r => r.content.slice(0, 150)),
    sources: results.map(r => ({
      type: r.sourceType,
      id: r.sourceId,
      title: r.sourceTitle || "Memory",
    })),
  };
}

async function searchReminders(
  userId: string,
  query: string,
  timeContext?: { date?: Date },
): Promise<SearchResult> {
  const now = new Date();
  
  let whereClause: any = {
    userId,
    status: "ACTIVE",
  };

  if (timeContext?.date) {
    whereClause.dueAt = {
      gte: new Date(timeContext.date.setHours(0, 0, 0, 0)),
      lt: new Date(timeContext.date.setHours(23, 59, 59, 999)),
    };
  } else {
    whereClause.dueAt = { gte: now };
  }

  const reminders = await prisma.reminder.findMany({
    where: whereClause,
    orderBy: { dueAt: "asc" },
    take: 10,
  });

  if (reminders.length === 0) {
    return {
      summary: "You don't have any active reminders matching that query.",
      evidence: [],
      sources: [],
    };
  }

  return {
    summary: `You have ${reminders.length} active reminder(s).`,
    evidence: reminders.map(r => 
      `${r.title}${r.dueAt ? ` (due ${formatDate(r.dueAt)} at ${formatTime(r.dueAt)})` : ""}`
    ),
    sources: reminders.map(r => ({
      type: "REMINDER",
      id: r.id,
      title: r.title,
    })),
  };
}

async function searchNotes(userId: string, query: string): Promise<SearchResult> {
  const results = await retrieveRelevantContent(userId, query, {
    sources: ["NOTE", "FILE"],
    limit: 5,
  });

  if (results.length === 0) {
    // Fallback: Text search
    const notes = await prisma.note.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 5,
    });

    if (notes.length === 0) {
      return {
        summary: `I couldn't find any notes matching "${query}".`,
        evidence: [],
        sources: [],
      };
    }

    return {
      summary: `Found ${notes.length} note(s) matching "${query}".`,
      evidence: notes.map(n => `${n.title}: ${n.content.slice(0, 100)}`),
      sources: notes.map(n => ({
        type: "NOTE",
        id: n.id,
        title: n.title,
      })),
    };
  }

  return {
    summary: `Found relevant notes for "${query}".`,
    evidence: results.map(r => `${r.sourceTitle}: ${r.content.slice(0, 100)}`),
    sources: results.map(r => ({
      type: r.sourceType,
      id: r.sourceId,
      title: r.sourceTitle || "Note",
    })),
  };
}

async function searchAll(userId: string, query: string): Promise<SearchResult> {
  // Combine all search types
  const [schedule, memory, reminders, notes] = await Promise.all([
    searchSchedule(userId, query),
    searchMemoryArtifacts(userId, query),
    searchReminders(userId, query),
    searchNotes(userId, query),
  ]);

  const allEvidence = [
    ...schedule.evidence,
    ...memory.evidence,
    ...reminders.evidence,
    ...notes.evidence,
  ];

  const allSources = [
    ...schedule.sources,
    ...memory.sources,
    ...reminders.sources,
    ...notes.sources,
  ];

  if (allEvidence.length === 0) {
    return {
      summary: `I couldn't find anything related to "${query}".`,
      evidence: [],
      sources: [],
    };
  }

  return {
    summary: `Found ${allSources.length} item(s) related to "${query}" across your schedule, memory, reminders, and notes.`,
    evidence: allEvidence.slice(0, 10),
    sources: allSources.slice(0, 10),
  };
}
```

---

## Phase 5: Voice UI Redesign

### 5.1 Voice Modal Component

**File**: `components/capture/voice-modal.tsx` (NEW)

```typescript
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, X, Loader2, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transcript: string) => Promise<void>;
  voiceResponseEnabled?: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export function VoiceModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  voiceResponseEnabled = true,
}: VoiceModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  
  // Audio visualization
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);
  
  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      streamRef.current = stream;
      
      // Setup audio visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      // Start visualization
      visualizeAudio();
      
      // Setup media recorder for actual recording
      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        // Stop visualization
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        
        // Stop audio context
        if (audioContextRef.current) {
          await audioContextRef.current.close();
        }
        
        // Process recording
        const blob = new Blob(chunks, { type: "audio/webm" });
        await processRecording(blob);
      };
      
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setLiveTranscript("");
      
    } catch (error) {
      console.error("Failed to start recording:", error);
      // Handle permission denied
    }
  }, []);
  
  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all tracks
      streamRef.current?.getTracks().forEach(track => track.stop());
    }
  }, [isRecording]);
  
  // Visualize audio
  const visualizeAudio = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = canvas.width / bufferLength * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, "rgba(124, 58, 237, 0.8)");
        gradient.addColorStop(1, "rgba(124, 58, 237, 0.3)");
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };
    
    draw();
  }, []);
  
  // Process recording
  const processRecording = async (blob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Send to transcription API
      const formData = new FormData();
      formData.append("audio", blob);
      
      const response = await fetch("/api/assistant/voice", {
        method: "POST",
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.transcript) {
        // Add user message
        const userMessage: Message = {
          id: Date.now().toString(),
          role: "user",
          content: result.transcript,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
        
        // Add assistant response
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.message || "Processed your request.",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Speak response if enabled
        if (voiceResponseEnabled && result.message) {
          await speakResponse(result.message);
        }
      }
      
    } catch (error) {
      console.error("Processing failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Text-to-speech
  const speakResponse = async (text: string) => {
    try {
      setIsSpeaking(true);
      
      const response = await fetch("/api/assistant/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) {
        throw new Error("TTS failed");
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
      
    } catch (error) {
      console.error("TTS failed:", error);
      setIsSpeaking(false);
    }
  };
  
  // Handle button press
  const handleButtonPress = useCallback(() => {
    if (isProcessing || isSpeaking) return;
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, isProcessing, isSpeaking, startRecording, stopRecording]);
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md mb-safe-area-bottom bg-surface-elevated rounded-t-3xl shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isRecording ? "bg-red-500 animate-pulse" : "bg-green-500"
            )} />
            <span className="text-sm font-medium text-text-secondary">
              {isRecording ? "Listening..." : isProcessing ? "Processing..." : "Ready"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-hover transition-colors"
          >
            <X size={20} className="text-text-secondary" />
          </button>
        </div>
        
        {/* Messages */}
        <div className="max-h-80 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary">
              <p className="text-sm">
                {isRecording 
                  ? "Speak now..." 
                  : "Hold the button below to speak"}
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2",
                    message.role === "user"
                      ? "bg-accent text-white"
                      : "bg-surface-muted text-text-primary"
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Audio visualizer */}
        {isRecording && (
          <div className="px-6 py-2">
            <canvas
              ref={canvasRef}
              width={300}
              height={60}
              className="w-full h-16 rounded-lg"
            />
          </div>
        )}
        
        {/* Record button */}
        <div className="flex justify-center py-6">
          <button
            onClick={handleButtonPress}
            disabled={isProcessing}
            className={cn(
              "relative w-20 h-20 rounded-full flex items-center justify-center transition-all",
              "bg-accent text-white shadow-lg",
              isRecording && "bg-red-500 scale-110",
              isProcessing && "opacity-70"
            )}
          >
            {isProcessing ? (
              <Loader2 size={28} className="animate-spin" />
            ) : isRecording ? (
              <MicOff size={28} />
            ) : (
              <Mic size={28} />
            )}
            
            {/* Pulse animation */}
            {isRecording && (
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
            )}
          </button>
        </div>
        
        {/* TTS indicator */}
        {isSpeaking && (
          <div className="flex items-center justify-center gap-2 py-2 text-text-secondary">
            <Volume2 size={16} className="animate-pulse" />
            <span className="text-xs">Speaking...</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 5.2 Updated Voice FAB

**File**: `components/capture/voice-fab.tsx`

```typescript
"use client";

import { useState } from "react";
import { Mic, Loader2 } from "lucide-react";
import { VoiceModal } from "./voice-modal";
import { useSettings } from "@/lib/hooks/use-settings";

export function VoiceFab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { voiceResponseEnabled } = useSettings();
  
  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        aria-label="Open voice assistant"
        className="fixed bottom-[calc(var(--tab-bar-height)+var(--safe-area-bottom)+16px)] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-all hover:bg-[#6D28D9] active:scale-95 lg:bottom-6 lg:right-6"
        style={{
          boxShadow: "0 4px 24px rgba(124, 58, 237, 0.3)",
        }}
      >
        <Mic size={22} />
      </button>
      
      <VoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (transcript) => {
          // Handle submission - this is called by the modal
        }}
        voiceResponseEnabled={voiceResponseEnabled}
      />
    </>
  );
}
```

### 5.3 TTS API Route

**File**: `app/api/assistant/tts/route.ts` (NEW)

```typescript
import { NextResponse } from "next/server";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { requireCurrentUser } from "@/lib/current-user";
import { resolveVoiceResponseEnabled, resolveTtsVoice } from "@/lib/ai/preferences";
import { env } from "@/lib/env";
import path from "path";

// Initialize Google Cloud TTS client
let ttsClient: TextToSpeechClient | null = null;

function getTtsClient() {
  if (!ttsClient) {
    // Use credentials file path
    const credentialsPath = path.join(
      process.cwd(),
      "gen-lang-client-0783002568-ad165865b71e.json"
    );
    
    ttsClient = new TextToSpeechClient({
      keyFilename: credentialsPath,
    });
  }
  return ttsClient;
}

export async function POST(request: Request) {
  const user = await requireCurrentUser();
  
  // Check if voice responses are enabled
  const voiceEnabled = resolveVoiceResponseEnabled(user as any);
  if (!voiceEnabled) {
    return NextResponse.json(
      { error: "Voice responses are disabled" },
      { status: 400 }
    );
  }
  
  try {
    const { text } = await request.json();
    
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }
    
    // Limit text length for free tier
    const maxLength = 500; // chars
    const truncatedText = text.slice(0, maxLength);
    
    // Get the voice to use
    const voice = resolveTtsVoice(user as any);
    
    const client = getTtsClient();
    
    const [response] = await client.synthesizeSpeech({
      input: { text: truncatedText },
      voice: {
        languageCode: "en-US",
        name: voice, // e.g., "en-US-Neural2-F"
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 1.0,
        pitch: 0,
      },
    });
    
    if (!response.audioContent) {
      throw new Error("No audio content returned");
    }
    
    // Return audio as MP3
    return new NextResponse(response.audioContent as Buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
    
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: "Text-to-speech failed" },
      { status: 500 }
    );
  }
}
```

### 5.4 Settings: Voice Response Toggle

**File**: `components/settings/ai-settings-form.tsx`

Add to the form:

```typescript
// Add to props
type AiSettingsFormProps = {
  // ... existing props
  currentVoiceResponseEnabled: boolean;
};

// Add to form
<label className="flex items-center justify-between space-y-0">
  <div className="space-y-0.5">
    <span className="text-sm font-medium text-text-primary">Voice responses</span>
    <p className="text-xs text-text-tertiary">
      Speak responses back after voice input
    </p>
  </div>
  <input
    type="checkbox"
    name="voiceResponseEnabled"
    defaultChecked={currentVoiceResponseEnabled}
    className="toggle"
  />
</label>
```

**File**: `prisma/schema.prisma`

```prisma
model User {
  // ... existing fields
  voiceResponseEnabled Boolean @default(true)
}
```

---

## Phase 6: Timetable Intelligence

### 6.1 Semester Inference Service

**File**: `lib/assistant/semester-inference.ts` (NEW)

```typescript
import { prisma } from "@/lib/db";
import { addMonths, startOfMonth, endOfMonth } from "date-fns";

interface SemesterRange {
  semesterStart: Date;
  semesterEnd: Date;
}

/**
 * Infers the appropriate semester range for a new timetable entry
 * based on existing entries or defaults to current semester.
 */
export async function inferSemesterRange(
  userId: string,
  entryDate?: Date
): Promise<SemesterRange> {
  // Get existing timetable entries to find semester pattern
  const existingEntries = await prisma.timetableEntry.findMany({
    where: { userId },
    select: {
      semesterStart: true,
      semesterEnd: true,
    },
    take: 1,
  });
  
  // If existing entries have semester range, use that
  if (existingEntries.length > 0 && existingEntries[0].semesterStart && existingEntries[0].semesterEnd) {
    return {
      semesterStart: existingEntries[0].semesterStart,
      semesterEnd: existingEntries[0].semesterEnd,
    };
  }
  
  // Default: current semester (assume 4 months from now)
  const now = entryDate || new Date();
  return {
    semesterStart: startOfMonth(now),
    semesterEnd: endOfMonth(addMonths(now, 4)),
  };
}

/**
 * Finds a timetable entry matching the given criteria.
 * Used for update operations.
 */
export async function findTimetableEntryByContext(
  userId: string,
  params: {
    dayOfWeek?: number;
    startTime?: string;
    subject?: string;
  }
) {
  const whereClause: any = { userId };
  
  if (params.dayOfWeek !== undefined) {
    whereClause.dayOfWeek = params.dayOfWeek;
  }
  
  if (params.startTime) {
    whereClause.startTime = params.startTime;
  }
  
  if (params.subject) {
    whereClause.subject = {
      contains: params.subject,
      mode: "insensitive",
    };
  }
  
  return prisma.timetableEntry.findFirst({
    where: whereClause,
  });
}
```

### 6.2 Update Timetable Entry Action

**File**: `lib/assistant/service.ts`

```typescript
async function executeUpdateTimetableEntry(
  action: UpdateTimetableEntryAction,
  userId: string
) {
  // Find the entry to update
  let entryId = action.entryId;
  
  // If no entryId, try to find by context (e.g., "my Monday 8am class")
  if (!entryId && action.updates) {
    // The LLM should provide the entryId, but fallback to search
    // This is handled by the LLM identifying the entry from context
  }
  
  if (!entryId) {
    return {
      success: false,
      message: "Could not identify which timetable entry to update.",
    };
  }
  
  // Get the existing entry
  const existingEntry = await prisma.timetableEntry.findUnique({
    where: { id: entryId, userId },
  });
  
  if (!existingEntry) {
    return {
      success: false,
      message: "Timetable entry not found.",
    };
  }
  
  // Perform the update
  const updatedEntry = await prisma.timetableEntry.update({
    where: { id: entryId },
    data: {
      subject: action.updates.subject ?? existingEntry.subject,
      startTime: action.updates.startTime ?? existingEntry.startTime,
      endTime: action.updates.endTime ?? existingEntry.endTime,
      location: action.updates.location ?? existingEntry.location,
      lecturer: action.updates.lecturer ?? existingEntry.lecturer,
    },
  });
  
  // Update memory artifact if exists
  if (updatedEntry) {
    await prisma.memoryArtifact.updateMany({
      where: {
        relatedEntityId: entryId,
        entityType: "TIMETABLE_ENTRY",
      },
      data: {
        title: `TIMETABLE_ENTRY: ${updatedEntry.subject}`,
        content: `${updatedEntry.subject} on ${getDayName(updatedEntry.dayOfWeek)} from ${updatedEntry.startTime} to ${updatedEntry.endTime}${updatedEntry.location ? ` at ${updatedEntry.location}` : ""}`,
      },
    });
  }
  
  return {
    success: true,
    message: `Updated ${updatedEntry.subject}${action.updates.subject && action.updates.subject !== existingEntry.subject ? ` (was ${existingEntry.subject})` : ""}.`,
    entry: updatedEntry,
  };
}
```

### 6.3 Smart Entity Type Decision

**File**: `lib/assistant/entity-decision.ts` (NEW)

```typescript
/**
 * Determines whether a new entry should be a reminder or timetable entry
 * based on the characteristics of the input.
 */

interface EntityDecisionInput {
  input: string;
  isRecurring: boolean;
  hasSemesterContext: boolean;
  existingTimetableEntries: number;
}

export type EntityDecision = "REMINDER" | "TIMETABLE_ENTRY";

export function decideEntityType(input: EntityDecisionInput): EntityDecision {
  const lower = input.input.toLowerCase();
  
  // Explicit timetable keywords
  const timetableKeywords = [
    "class", "lecture", "tutorial", "seminar", "lab",
    "semester", "course", "module",
  ];
  
  // Explicit reminder keywords
  const reminderKeywords = [
    "remind me", "reminder", "don't forget", "remember to",
    "meeting", "appointment", "deadline", "due",
  ];
  
  // Check for explicit keywords
  const hasTimetableKeyword = timetableKeywords.some(kw => lower.includes(kw));
  const hasReminderKeyword = reminderKeywords.some(kw => lower.includes(kw));
  
  // If recurring and mentions semester/class context → timetable
  if (input.isRecurring && (hasTimetableKeyword || input.hasSemesterContext)) {
    return "TIMETABLE_ENTRY";
  }
  
  // If recurring without timetable context → recurring reminder
  if (input.isRecurring) {
    return "REMINDER";
  }
  
  // If explicit reminder keyword → reminder
  if (hasReminderKeyword) {
    return "REMINDER";
  }
  
  // If explicit timetable keyword and recurring pattern → timetable
  if (hasTimetableKeyword && input.existingTimetableEntries > 0) {
    return "TIMETABLE_ENTRY";
  }
  
  // Default: one-time reminder
  return "REMINDER";
}

/**
 * Analyzes input for recurring patterns.
 */
export function detectRecurringPattern(input: string): {
  isRecurring: boolean;
  frequency?: "DAILY" | "WEEKLY" | "MONTHLY";
  daysOfWeek?: number[];
} {
  const lower = input.toLowerCase();
  
  // Check for recurring keywords
  if (lower.includes("every day") || lower.includes("daily")) {
    return { isRecurring: true, frequency: "DAILY" };
  }
  
  if (lower.includes("every week") || lower.includes("weekly")) {
    return { isRecurring: true, frequency: "WEEKLY" };
  }
  
  if (lower.includes("every month") || lower.includes("monthly")) {
    return { isRecurring: true, frequency: "MONTHLY" };
  }
  
  // Check for specific day patterns: "every Monday", "on Mondays"
  const dayPattern = /(?:every|on)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?/i;
  const dayMatch = lower.match(dayPattern);
  
  if (dayMatch) {
    const dayMap: Record<string, number> = {
      "monday": 1,
      "tuesday": 2,
      "wednesday": 3,
      "thursday": 4,
      "friday": 5,
      "saturday": 6,
      "sunday": 7,
    };
    
    return {
      isRecurring: true,
      frequency: "WEEKLY",
      daysOfWeek: [dayMap[dayMatch[1].toLowerCase()]],
    };
  }
  
  return { isRecurring: false };
}
```

### 6.4 Context-Enhanced Prompts

Add to the LLM prompt:

```typescript
const CONTEXT_ENHANCEMENT = `
## CONTEXT ENHANCEMENT

When processing user input, consider the following context:

### Existing Timetable
{{#if timetableEntries.length}}
The user has {{timetableEntries.length}} timetable entries:
{{#each timetableEntries}}
- {{subject}} on {{dayName dayOfWeek}} {{startTime}}-{{endTime}}
{{/each}}

Use this to:
1. Match "my Monday 8am class" to existing entries
2. Infer semester dates from existing entries
3. Detect patterns in class naming
{{else}}
The user has no timetable entries yet.
{{/if}}

### Semester Context
{{#if semesterContext}}
Semester: {{formatDate semesterContext.semesterStart}} to {{formatDate semesterContext.semesterEnd}}
Use these dates for new timetable entries unless user specifies otherwise.
{{else}}
No semester context available. Infer from input or use defaults.
{{/if}}

### Recent Memory
{{#if recentMemoryArtifacts.length}}
Recent memory items:
{{#each recentMemoryArtifacts}}
- {{title}}: {{content}}
{{/each}}

Reference this when user asks "what did I say about..." queries.
{{/if}}
`;
```

---

## Phase 7: Error Handling & Edge Cases

### 7.1 LLM Timeout Fallback

**File**: `lib/assistant/service.ts`

```typescript
const LLM_TIMEOUT_MS = 15000; // 15 seconds

async function generateActionWithFallback(
  request: AssistantRequest,
  context: AssistantContext
): Promise<AssistantAction> {
  try {
    // Try LLM with timeout
    const result = await Promise.race([
      generateStructuredAssistantAction(request, context),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("LLM timeout")), LLM_TIMEOUT_MS)
      ),
    ]);
    
    return result;
    
  } catch (error) {
    // Log the error
    logWarn("assistant.llm-fallback", {
      error: error instanceof Error ? error.message : "Unknown error",
      input: request.input.slice(0, 100),
    });
    
    // Fallback to heuristics
    return parseAssistantIntentHeuristically(request.input, context);
  }
}
```

### 7.2 Empty Input Handling

**File**: `lib/assistant/service.ts`

```typescript
function validateInput(input: string): { valid: boolean; error?: string } {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return { valid: false, error: "Please say something." };
  }
  
  if (trimmed.length < 2) {
    return { valid: false, error: "That's too short. Please provide more details." };
  }
  
  if (trimmed.length > 2000) {
    return { valid: false, error: "That's too long. Please break it into smaller requests." };
  }
  
  return { valid: true };
}
```

### 7.3 High-Impact Action Confirmation

**File**: `lib/assistant/confirmation.ts` (NEW)

```typescript
import { AssistantAction, ASSISTANT_ACTION_TYPE } from "./types";

/**
 * Determines if an action requires user confirmation before execution.
 */
export function requiresConfirmation(action: AssistantAction): boolean {
  switch (action.type) {
    case ASSISTANT_ACTION_TYPE.DELETE_ENTITY:
      // Always require confirmation for deletions
      return action.requiresConfirmation ?? true;
      
    case ASSISTANT_ACTION_TYPE.UPDATE_TIMETABLE_ENTRY:
      // Require confirmation for subject changes
      return !!action.updates?.subject;
      
    default:
      return false;
  }
}

/**
 * Generates a confirmation message for an action.
 */
export function generateConfirmationMessage(action: AssistantAction): string {
  switch (action.type) {
    case ASSISTANT_ACTION_TYPE.DELETE_ENTITY:
      return `Are you sure you want to delete this ${action.entityType.toLowerCase()}? This cannot be undone.`;
      
    case ASSISTANT_ACTION_TYPE.UPDATE_TIMETABLE_ENTRY:
      return `Confirm update to timetable entry?`;
      
    default:
      return "Please confirm this action.";
  }
}

/**
 * Handles confirmation flow for high-impact actions.
 */
export async function handleConfirmationFlow(
  action: AssistantAction,
  onConfirm: () => Promise<void>,
  onCancel: () => void
): Promise<{ confirmed: boolean; result?: any }> {
  // In voice mode, automatically confirm if not critical
  // In chat mode, ask for confirmation
  
  return {
    confirmed: false,
    result: {
      message: generateConfirmationMessage(action),
      awaitingConfirmation: true,
    },
  };
}
```

### 7.4 Graceful Degradation

**File**: `lib/assistant/service.ts`

```typescript
async function executeAction(
  action: AssistantAction,
  userId: string,
  context: AssistantContext
): Promise<ActionResult> {
  try {
    switch (action.type) {
      case ASSISTANT_ACTION_TYPE.CREATE_REMINDER:
        return await executeCreateReminder(action, userId, context);
        
      case ASSISTANT_ACTION_TYPE.CREATE_NOTE:
        return await executeCreateNote(action, userId, context);
        
      case ASSISTANT_ACTION_TYPE.CREATE_TIMETABLE_ENTRY:
        return await executeCreateTimetableEntry(action, userId, context);
        
      case ASSISTANT_ACTION_TYPE.UPDATE_TIMETABLE_ENTRY:
        if (requiresConfirmation(action)) {
          return {
            success: false,
            message: generateConfirmationMessage(action),
            awaitingConfirmation: true,
            pendingAction: action,
          };
        }
        return await executeUpdateTimetableEntry(action, userId);
        
      case ASSISTANT_ACTION_TYPE.DELETE_ENTITY:
        if (requiresConfirmation(action)) {
          return {
            success: false,
            message: generateConfirmationMessage(action),
            awaitingConfirmation: true,
            pendingAction: action,
          };
        }
        return await executeDeleteEntity(action, userId);
        
      case ASSISTANT_ACTION_TYPE.SEARCH_MEMORY:
        return await executeSearchMemory({
          userId,
          query: action.query,
          target: action.target,
          timeContext: action.timeContext,
        });
        
      case ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS:
        return {
          success: false,
          message: action.clarification.question,
          missingFields: action.clarification.missingFields,
        };
        
      case ASSISTANT_ACTION_TYPE.DISAMBIGUATE:
        return {
          success: false,
          message: "I'm not sure what you mean. Please choose:",
          options: action.options,
          defaultOption: action.defaultOption,
        };
        
      case ASSISTANT_ACTION_TYPE.REJECT_REQUEST:
        return {
          success: false,
          message: action.reason,
        };
        
      default:
        return {
          success: false,
          message: "I couldn't understand that request. Please try rephrasing.",
        };
    }
  } catch (error) {
    logError("assistant.action-failed", {
      action: action.type,
      userId,
      error,
    });
    
    return {
      success: false,
      message: "Something went wrong. Please try again.",
    };
  }
}
```

### 7.5 Voice-Specific Error Handling

**File**: `app/api/assistant/voice/route.ts`

```typescript
export async function POST(request: Request) {
  const user = await requireCurrentUser();

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!(audioFile instanceof File) || audioFile.size === 0) {
      return NextResponse.json(
        { 
          error: "No audio received",
          message: "I didn't catch that. Please try again.",
        },
        { status: 400 }
      );
    }

    // Check audio duration (max 60 seconds)
    const maxDurationBytes = 5 * 1024 * 1024; // ~5MB for 60s of audio
    if (audioFile.size > maxDurationBytes) {
      return NextResponse.json(
        {
          error: "Audio too long",
          message: "That's too long. Please keep it under 60 seconds.",
        },
        { status: 400 }
      );
    }

    const result = await runVoiceAssistantWorkflow(user.id, {
      audioFile,
      conversationId,
    });

    // Generate brief response for voice
    const briefMessage = generateBriefResponse(result);

    return NextResponse.json({
      transcript: result.transcript,
      message: briefMessage,
      fullMessage: result.result.message,
      kind: result.result.kind,
      conversationId: result.result.conversationId,
    });

  } catch (error) {
    logError("assistant.voice.failed", {
      userId: user.id,
      error,
    });

    return NextResponse.json(
      { 
        error: "Processing failed",
        message: "I couldn't process that. Please try again.",
      },
      { status: 500 }
    );
  }
}

/**
 * Generates a brief response suitable for TTS.
 */
function generateBriefResponse(result: VoiceWorkflowResult): string {
  const { result: actionResult } = result;
  
  // For successful actions, create 1-2 sentence summary
  if (actionResult.kind === "CREATE_REMINDER") {
    return `Got it. Reminder created.`;
  }
  
  if (actionResult.kind === "CREATE_NOTE") {
    return `Note saved.`;
  }
  
  if (actionResult.kind === "CREATE_TIMETABLE_ENTRY") {
    return `Class added to your timetable.`;
  }
  
  if (actionResult.kind === "SEARCH_MEMORY") {
    // Return the actual answer for queries
    return actionResult.message?.slice(0, 150) || "I found some results.";
  }
  
  // For clarifications, return the question
  if (actionResult.missingFields) {
    return actionResult.message || "Could you clarify?";
  }
  
  return "Done.";
}
```

---

## File Changes Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `lib/assistant/types.ts` | Extended action types and interfaces |
| `lib/assistant/queries.ts` | Search/memory query handling |
| `lib/assistant/semester-inference.ts` | Semester range inference |
| `lib/assistant/entity-decision.ts` | Entity type decision logic |
| `lib/assistant/confirmation.ts` | High-impact action confirmation |
| `lib/memory/dual-write.ts` | Dual-write pattern for memory |
| `lib/memory/types.ts` | Memory-related types |
| `lib/ai/tts.ts` | Google Cloud TTS integration |
| `components/capture/voice-modal.tsx` | Voice popup modal component |
| `app/api/assistant/tts/route.ts` | TTS API endpoint |

### Files to Modify

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add `voiceResponseEnabled`, `relatedEntityId`, `entityType` |
| `lib/env.ts` | Add Google Cloud credentials path |
| `lib/ai/preferences.ts` | Add TTS provider configuration |
| `lib/ai/providers/text.ts` | Redesign prompts, expand JSON schema |
| `lib/ai/heuristics.ts` | Keep as fallback only |
| `lib/assistant/service.ts` | Remove heuristics default, add new action handlers |
| `lib/assistant/context.ts` | Enhanced context building |
| `lib/memory/service.ts` | Entity linking, dual-write integration |
| `lib/retrieval/service.ts` | Memory artifact retrieval |
| `components/capture/voice-fab.tsx` | Integrate with modal |
| `components/settings/ai-settings-form.tsx` | Add voice response toggle |
| `app/api/assistant/voice/route.ts` | Brief responses, better error handling |
| `app/me/page.tsx` | Pass voice settings to form |

### Database Migration

```bash
npx prisma migrate dev --name nl_voice_overhaul
```

---

## Testing Strategy

### Unit Tests

**File**: `tests/lib/assistant/queries.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { executeSearchMemory } from "@/lib/assistant/queries";

describe("executeSearchMemory", () => {
  it("should find timetable entries by day", async () => {
    // Setup: Create test timetable entry
    // Test: Search for "what class do I have tomorrow"
    // Assert: Returns correct class
  });
  
  it("should find memory artifacts by keyword", async () => {
    // Setup: Create memory artifact about breakfast
    // Test: Search for "what did I say about breakfast"
    // Assert: Returns memory artifact
  });
  
  it("should combine multiple sources for ALL target", async () => {
    // Test: Search with target="ALL"
    // Assert: Returns combined results
  });
});
```

**File**: `tests/lib/assistant/entity-decision.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { decideEntityType, detectRecurringPattern } from "@/lib/assistant/entity-decision";

describe("decideEntityType", () => {
  it("should return REMINDER for one-time meeting", () => {
    const result = decideEntityType({
      input: "I have a meeting at 3pm",
      isRecurring: false,
      hasSemesterContext: false,
      existingTimetableEntries: 0,
    });
    expect(result).toBe("REMINDER");
  });
  
  it("should return TIMETABLE_ENTRY for recurring class", () => {
    const result = decideEntityType({
      input: "I have a lecture every Monday at 10am",
      isRecurring: true,
      hasSemesterContext: true,
      existingTimetableEntries: 5,
    });
    expect(result).toBe("TIMETABLE_ENTRY");
  });
});

describe("detectRecurringPattern", () => {
  it("should detect 'every Monday' pattern", () => {
    const result = detectRecurringPattern("remind me every Monday at 8am");
    expect(result.isRecurring).toBe(true);
    expect(result.frequency).toBe("WEEKLY");
    expect(result.daysOfWeek).toEqual([1]);
  });
  
  it("should detect 'daily' pattern", () => {
    const result = detectRecurringPattern("remind me daily");
    expect(result.isRecurring).toBe(true);
    expect(result.frequency).toBe("DAILY");
  });
});
```

### Integration Tests

**File**: `tests/lib/assistant/service.integration.test.ts`

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { runAssistantWorkflow } from "@/lib/assistant/service";
import { createTestUser, cleanupTestUser } from "../helpers";

describe("Assistant Service Integration", () => {
  let userId: string;
  
  beforeEach(async () => {
    userId = await createTestUser();
  });
  
  afterEach(async () => {
    await cleanupTestUser(userId);
  });
  
  it("should create reminder from natural language", async () => {
    const result = await runAssistantWorkflow(userId, {
      input: "remind me to pick up groceries at 5pm",
    });
    
    expect(result.kind).toBe("CREATE_REMINDER");
    expect(result.reminder?.title).toContain("groceries");
  });
  
  it("should create note with memory", async () => {
    const result = await runAssistantWorkflow(userId, {
      input: "note that I need to make breakfast in the morning",
    });
    
    expect(result.kind).toBe("CREATE_NOTE");
    // Verify memory artifact was created
  });
  
  it("should answer timetable queries", async () => {
    // Setup: Create timetable entry
    const result = await runAssistantWorkflow(userId, {
      input: "what class do I have tomorrow at 8am",
    });
    
    expect(result.kind).toBe("SEARCH_MEMORY");
    expect(result.message).toContain("class");
  });
});
```

### Manual Testing Checklist

**Voice Modal:**
- [ ] Hold button starts recording
- [ ] Audio visualization shows
- [ ] Release sends for processing
- [ ] Transcript appears
- [ ] Response appears
- [ ] TTS speaks response (when enabled)
- [ ] TTS toggle works
- [ ] Modal closes on outside tap
- [ ] Can hold again to continue conversation

**Natural Language:**
- [ ] "Note that I need to make breakfast" creates note + memory
- [ ] "I have a meeting at 3pm" creates reminder
- [ ] "My Monday 8am class changed to Chemistry" updates timetable
- [ ] "What class do I have tomorrow?" returns answer
- [ ] "What did I say about breakfast?" returns memory
- [ ] Ambiguous inputs get best-guess with alternatives

---

## Rollout Plan

### Phase 1: Foundation (Week 1)

1. **Schema changes**
   - Add new fields to User and MemoryArtifact
   - Run migration
   - Update Prisma client

2. **Type definitions**
   - Create new action types
   - Update existing interfaces
   - Add Zod schemas

3. **Environment setup**
   - Add Google Cloud credentials path
   - Test TTS connection

### Phase 2: Core Logic (Week 2)

1. **LLM prompt redesign**
   - Implement new system prompt
   - Add few-shot examples
   - Expand JSON schema

2. **Memory integration**
   - Implement dual-write pattern
   - Add entity linking
   - Update context building

3. **Query handling**
   - Implement search functions
   - Add multi-source retrieval
   - Handle time contexts

### Phase 3: Voice UI (Week 3)

1. **Voice modal**
   - Create modal component
   - Add audio visualization
   - Implement hold-to-speak

2. **TTS integration**
   - Create TTS API route
   - Add brief response generation
   - Test voice quality

3. **Settings**
   - Add voice response toggle
   - Update settings page
   - Persist preferences

### Phase 4: Polish & Testing (Week 4)

1. **Error handling**
   - Add timeout fallbacks
   - Implement confirmation flows
   - Handle edge cases

2. **Testing**
   - Write unit tests
   - Run integration tests
   - Manual testing

3. **Performance**
   - Optimize LLM calls
   - Cache common responses
   - Monitor latency

### Deployment

1. **Staging**
   - Deploy to preview environment
   - Run full test suite
   - Monitor for errors

2. **Production**
   - Enable feature flags
   - Gradual rollout (10% → 50% → 100%)
   - Monitor metrics

3. **Post-deployment**
   - Gather user feedback
   - Track success rates
   - Iterate based on data

---

## Success Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Intent classification accuracy | ~40% | ~95% | 2 weeks post-launch |
| Clarification rate | ~60% | ~15% | 2 weeks post-launch |
| Memory recall success | 0% | ~90% | 3 weeks post-launch |
| Voice interaction completion | N/A | Baseline | 1 week post-launch |
| User satisfaction | N/A | >4.0/5 | 1 month post-launch |

---

## Appendix

### A. Google Cloud TTS Setup

1. Create Google Cloud project
2. Enable Text-to-Speech API
3. Create service account with TTS permissions
4. Download JSON credentials
5. Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable

### B. Environment Variables

```bash
# Required for TTS
GOOGLE_APPLICATION_CREDENTIALS=/path/to/gen-lang-client-0783002568-ad165865b71e.json

# Optional: Override defaults
TTS_VOICE=en-US-Neural2-F
TTS_MAX_LENGTH=500
LLM_TIMEOUT_MS=15000
```

### C. API Rate Limits

| Service | Limit | Notes |
|---------|-------|-------|
| Google Cloud TTS | 1M chars/month | Free tier |
| OpenRouter | Varies by model | Check plan |
| Groq Whisper | Rate limited | Check plan |

---

**End of Implementation Plan**
