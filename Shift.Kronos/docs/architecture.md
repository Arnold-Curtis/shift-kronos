# Architecture

## Overview

Shift.Kronos is planned as a Vercel-hosted Next.js application with PostgreSQL as the source of truth, Telegram as the primary notification channel, and AI services layered on top for capture, parsing, retrieval, and memory.

The architecture should preserve a simple rule: deterministic application logic owns scheduling and reminders, while AI augments capture, interpretation, and retrieval.

## Proposed Stack

### Application Layer

- Next.js on Vercel
- App Router
- TypeScript
- Tailwind CSS
- PWA support

### Data Layer

- PostgreSQL
- Neon as the likely hosting option
- `pgvector` for embeddings and semantic search
- Prisma as ORM

### Auth

- Clerk

### Storage

- Vercel Blob for uploaded files

### Notification Layer

- Telegram Bot API
- polling mode in the current design discussion

### AI Layer

- Groq for fast voice transcription workflows
- per-feature model selection for parsing, suggestions, and other intelligence tasks
- Gemini `text-embedding-004` for embeddings
- local Ollama support as part of the model strategy where appropriate

## System Boundaries

### What Must Be Deterministic

These features should not depend on an LLM to function correctly:

- reminder storage
- reminder scheduling
- recurrence logic
- timetable storage
- notification triggering
- completion and snooze actions
- export logic

### What AI Enhances

AI is appropriate for:

- natural language parsing
- voice-to-action conversion
- smart categorization
- semantic search
- behavior suggestions
- summarization
- conversational retrieval over notes, files, and schedule context

## Current Foundation Implementation

Phase 1 has established these concrete application boundaries:

- `app/` for route composition and page-level entry points
- `components/` for reusable presentation and shell components
- `lib/` for shared application code such as env validation, database access, auth helpers, and integration boundaries
- `prisma/` for relational schema ownership
- `tests/` for baseline automated verification
- `docs/smd/phase-1/` for implementation-specific completion records

## Current Phase 2 Implementation

Phase 2 extends the foundation into working deterministic scheduling and capture boundaries:

- `lib/current-user.ts` resolves and persists the authenticated Clerk user into the application `User` model
- `lib/reminders/` owns reminder validation, recurrence behavior, grouping, and data access
- `lib/timetable/` owns timetable validation, weekly occurrence expansion, import validation, and data access
- `lib/dashboard/queries.ts` composes reminders and timetable data into dashboard-facing sections
- `lib/datetime.ts` centralizes the deterministic date/time helpers that reminder and timetable logic now share
- `app/reminders/` and `app/timetable/` now expose working forms and server actions instead of placeholders
- `docs/smd/phase-2/` records the implementation truth for scheduling and capture

## Current Phase 3 Implementation

Phase 3 extends the deterministic scheduling foundation into a real delivery pipeline:

- `lib/notifications/` owns due-item contracts, occurrence identity, dedupe keys, Telegram callback payloads, message formatting, transport integration, and dispatch coordination
- `app/api/cron/notifications/route.ts` exposes a dispatch endpoint for cron-driven notification checks
- `app/api/telegram/route.ts` handles Telegram callback updates and maps them into persisted application state transitions
- `NotificationEvent` now stores explicit delivery status, provider metadata, occurrence identity, and callback action timestamps
- persisted `User.telegramChatId` is the primary chat binding, with environment chat id available only as a bootstrap fallback

## Current Phase 4 Implementation

Phase 4 extends the product into a first real AI-assisted interaction layer without weakening deterministic application boundaries:

- `lib/assistant/` now owns assistant action types, input schemas, user-context assembly, conversation persistence helpers, and the shared parse-then-execute workflow
- `lib/ai/` now owns provider-facing text and transcription boundaries, with a deterministic fallback parser to preserve behavior when provider integration is incomplete or unavailable
- `Conversation` and `ConversationMessage` now persist assistant interactions separately from future long-term memory artifacts
- `app/chat/` exposes server actions and a first-class in-app chat route for grounded assistant interaction
- `app/api/telegram/route.ts` now accepts Telegram inbound text messages in addition to callback actions and routes them into the same validated assistant workflow
- dashboard quick capture and the voice-transcript path both reuse the exact same server-side reminder execution boundary

## Current Phase 5 Implementation

Phase 5 expands the grounded assistant into a retrieval-backed knowledge system while keeping notes and files as first-class product surfaces:

- `lib/notes/` now owns note validation, persistence, and note-index lifecycle integration
- `lib/files/` now owns blob-backed file persistence, MIME-aware extraction, and file-index lifecycle integration
- `lib/retrieval/` now owns deterministic chunk preparation, embedding coordination, vector-query execution, and indexed-content replacement
- `RetrievalChunk` now stores derived note/file retrieval chunks separately from source records so chunking, provenance, and reindexing stay explicit
- `app/notes/` and `app/files/` now expose real management surfaces rather than placeholders
- assistant context assembly now includes retrieval-backed note/file evidence for grounded answers

## High-Level Components

### Web App

Primary interface for:

- dashboard
- reminders
- timetable management
- notes
- files
- AI chat
- settings

### Telegram Bot

Secondary interface for:

- receiving notifications
- marking items done
- snoozing items
- quick add through natural language
- lightweight conversational access

### Scheduler

A server-side process, likely driven by Vercel Cron, checks due reminders and timetable alerts and dispatches messages to Telegram.

Phase 3 now implements the application-side dispatch boundary for this through a dedicated cron route and shared notification coordinator.

### AI Orchestration Layer

Responsible for:

- routing tasks to appropriate models
- converting natural language into structured application commands
- retrieving relevant context
- summarizing older conversations and history

## Validation And Testing Boundaries

Reliability in Shift.Kronos depends on validating every layer at the right boundary.

### Configuration Layer

- environment variables should be parsed and validated explicitly
- missing or malformed configuration should fail fast rather than degrade silently

### Deterministic Domain Layer

- reminder scheduling, recurrence, timetable storage, and notification deduplication should be covered by automated tests as they are introduced
- AI output must never bypass server-side validation before mutating application state

### Integration Layer

- auth, storage, Telegram, and AI providers should be isolated behind explicit boundaries
- provider-specific behavior should not leak into core scheduling logic

Phase 3 follows that rule by isolating Telegram formatting and HTTP transport in `lib/notifications/telegram.ts` and `lib/notifications/telegram-format.ts`.

Phase 4 follows the same rule by isolating assistant orchestration and provider interaction behind `lib/assistant/` and `lib/ai/` rather than embedding parsing or execution logic in routes or UI components.

Phase 5 extends that rule by isolating notes/files retrieval in `lib/retrieval/` and keeping vector-specific SQL inside that boundary rather than leaking it into route handlers or source-record services.

Phase 6 extends that rule again by isolating memory summarization, token budgeting, and reinjection inside `lib/memory/` while continuing to reuse `lib/retrieval/` for vector indexing and search over derived memory artifacts.

Phase 7 extends it further by isolating deterministic backup/export logic in `lib/export/`, operational request verification in `lib/operations/`, and structured logging in `lib/observability/` rather than scattering those concerns across route handlers and UI components.

### Delivery Workflow

- lint, typecheck, tests, and production build verification are part of the implementation workflow, not optional cleanup

## Data Model Direction

The exact schema will be refined during implementation, but the domain model should include:

### User

Single-user first, but modeled cleanly enough that expansion remains possible later.

Fields likely include:

- auth identity
- Telegram chat id
- timezone
- preferences

### Reminder

Fields likely include:

- title
- description
- type
- priority
- category
- due time or trigger time
- recurrence rule
- status
- completion metadata
- snooze metadata

Phase 2 now concretely models recurrence with explicit frequency, interval, selected weekdays, and optional end date fields in addition to a serialized recurrence payload for traceability.

Phase 3 builds on that by treating one-time reminder delivery as occurrence-specific and by handling recurring reminder notification callbacks without collapsing Telegram transport concerns into reminder storage.

### Timetable Entry

Fields likely include:

- subject
- location
- lecturer or optional metadata
- day of week
- start time
- end time
- semester start
- semester end
- reminder configuration

Phase 2 currently treats timetable entries as weekly repeated class definitions constrained by semester date range. Holiday skipping and advanced override machinery remain out of scope.

### Note

Fields likely include:

- title
- content
- tags
- embeddings or searchable companion records

### File

Fields likely include:

- blob url or blob key
- original filename
- content type
- extracted text
- embeddings
- optional linkage to notes or reminders

### Conversation and Memory Records

Fields likely include:

- message role
- message content
- token estimates
- summary level
- summary content
- retrieval metadata

Phase 1 implementation currently models the early memory direction through a lean `MemoryArtifact` table so the schema can evolve without treating memory as an afterthought.

Phase 6 now turns that early placeholder into a derived persistent memory layer. `Conversation` and `ConversationMessage` remain the raw interaction ledger, while `MemoryArtifact` stores provenance-rich summaries over older message windows with coverage metadata, token estimates, and indexing state.

## Timetable Import Flow

Expected flow:

1. user extracts timetable information with a vision-capable model outside or inside the product workflow
2. user pastes standardized JSON into the app
3. app validates the JSON shape
4. app writes timetable entries to the database
5. timetable entries become visible in weekly and upcoming views
6. scheduler begins producing notifications according to configured lead times

The application should eventually include an example JSON contract to make AI-assisted extraction consistent.

Phase 2 now implements a strict contract where the payload is an object containing an `entries` array. Each entry must satisfy the same validation rules as manual timetable creation before any persistence occurs.

## Notification Flow Implementation

Phase 3 now concretely implements the notification flow as:

1. cron route requests pending due items
2. shared notification services compute reminder and timetable due items deterministically
3. each due item receives a stable occurrence key and dedupe key
4. existing pending or delivered events suppress duplicate sends
5. a notification event is reserved in pending state
6. Telegram transport sends the formatted message with inline actions
7. the event is marked delivered or failed
8. Telegram callback actions map back into reminder or notification-event state changes

## Reminder Capture Flows

### Structured Form Flow

The user fills in fields directly. This is the most deterministic path and should always be available.

### Natural Language Flow

The user types or speaks naturally. The AI returns structured output, and the server validates and writes it.

### Telegram Quick Add Flow

The user messages the bot naturally. The system parses intent, proposes or confirms the structured result, and stores the reminder.

## Notification Flow

1. scheduler checks for due items
2. server computes which items should trigger
3. Telegram message is formatted
4. inline actions are attached where relevant
5. event is logged to avoid accidental duplicate sends
6. user can complete or snooze from Telegram

## Memory Architecture Direction

The agreed direction is a layered memory system, not a stateless chatbot.

### Recent Context Layer

Keeps recent interactions in more detail.

### Summary Layers

When context grows large, older information is summarized into multiple documents. Over time, these can be summarized again into more compressed forms while preserving major facts, preferences, patterns, and commitments.

Phase 6 implements the first production version of this through bounded conversation-window summaries and explicit summary levels on `MemoryArtifact`. Raw conversation messages remain stored even after summary artifacts are created.

### Retrieval Layer

Embeddings and semantic search help recover relevant notes, files, summaries, and related records for a given question or task.

Phase 6 now includes memory artifacts in that retrieval layer through `RetrievalSourceType.MEMORY`, so continuity retrieval reuses the same vector-search subsystem as note and file grounding.

### Application State Layer

Structured context such as upcoming schedule, active reminders, user preferences, notes, and selected files can be passed directly to the model when useful.

Phase 6 extends context assembly with recent raw conversation turns and relevant memory summaries, trimmed through explicit token-budget-aware selection rather than ad hoc prompt growth.

## Key Technical Risks

### Scheduler Reliability on Serverless

Notification reliability must be validated carefully when using serverless cron and Telegram delivery.

### AI Action Safety

Model outputs must be validated before changing reminders, timetable records, or memory artifacts.

### Prompt Context Growth

The memory system needs disciplined summarization and retrieval boundaries so context remains useful and affordable.

### File Processing Complexity

Extracting text from different file types and keeping them searchable introduces pipeline and cost complexity.

### Operational Observability Gaps

Cron dispatch, webhooks, exports, and background-like workflows become difficult to trust if failures are not logged explicitly and protected by verified entry boundaries.

## Implementation Guidance

- keep deterministic reminder logic separate from AI parsing logic
- define strict schemas for AI outputs
- log outbound notifications and Telegram actions
- model reminders and timetable entries explicitly instead of collapsing everything into one generic item too early
- build the simplest memory pipeline that still respects the documented vision
- keep export and backup logic derived from source-of-truth records rather than UI state or derived retrieval artifacts
- prefer installable PWA behavior with conservative caching over broad offline claims for authenticated dynamic routes

Phase 2 implementation follows that guidance by placing reminder and timetable rules in shared server-side modules rather than page-level form handlers.

## Initial Recommendation

The initial implementation should establish these foundations first:

1. auth
2. database schema
3. reminders
4. timetable
5. scheduler and Telegram delivery
6. AI-assisted input parsing
7. notes and files
8. layered memory and retrieval

## Documentation Discipline

When implementation clarifies or changes planning assumptions, the documentation should be updated in the same phase so future work follows current truth rather than stale intent. Phase completion records in `docs/smd/` exist to support that workflow.
