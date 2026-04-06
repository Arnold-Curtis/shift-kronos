# Decisions Log

## Purpose

This file records the important decisions already made so they are not repeatedly reopened during implementation unless a real constraint changes.

## Product Scope Decisions

### Single-user first

The product is initially designed for one user only.

Reasoning:

- simpler product model
- lower auth and permissions complexity
- faster path to usefulness

### Feature-rich direction

The product should not be artificially narrow. It should support a broad range of reminder and knowledge-management use cases, while preserving simplicity for frequent tasks.

Reasoning:

- the user wants one dependable personal system
- fragmentation across multiple tools is part of the original problem

### App-first, Telegram-second

The web application is the primary interface. Telegram is primarily for delivery and quick interaction.

Reasoning:

- richer administrative interface in the app
- Telegram remains useful for speed and mobility

## Stack Decisions

### Hosting: Vercel

Chosen as the deployment target.

### Framework: Next.js

The likely starting framework for the application.

### Database: PostgreSQL

SQL was a hard requirement. PostgreSQL is the preferred choice.

### Database hosting direction: Neon

Current preferred option due to good fit with Vercel workflows and PostgreSQL support.

### ORM: Prisma

Current preferred ORM for schema management and developer experience.

### Auth: Clerk

Chosen for managed auth and ease of use.

### Storage: Vercel Blob

Chosen as the first file storage direction.

### Vector search: `pgvector`

Chosen so embeddings can remain close to primary relational data.

### Testing as a workflow gate

Testing is a formal completion requirement, not a later hardening activity.

Reasoning:

- reminder and timetable behavior are correctness-sensitive
- Telegram delivery and scheduler work are reliability-sensitive
- AI-assisted features require validation against deterministic rules
- shipping without continuous verification would create compounding risk in later phases

### Route-first application shell

The major application areas should exist as explicit routes and navigation targets before each feature is fully implemented.

Reasoning:

- keeps the product structure stable as features are added
- avoids mixing layout concerns with feature delivery later
- makes documentation and implementation progress easier to track

## AI Decisions

### Voice direction

Voice input is required, and the user wants a Groq-based approach in the current planning direction.

### Embeddings

Gemini `gemini-embedding-001` is the current choice.

### Model strategy

Per-feature model selection is preferred.

Reasoning:

- different workloads have different cost and quality needs
- local and hosted models can coexist

### Memory system in MVP

The persistent memory system is explicitly in scope for the initial serious release, not deferred to a much later phase.

### AI interfaces

All of these are in scope over time:

- in-app chat
- Telegram chat
- background parsing
- voice-driven interactions

## Feature Decisions

### Reminder types

In scope:

- one-time reminders
- recurring reminders
- habits
- countdowns

### Recurrence modeling for Phase 2

Phase 2 should use constrained structured recurrence rather than relying solely on a freeform recurrence string.

Reasoning:

- explicit recurrence fields are easier to validate on the server
- reminder forms and tests can rely on stable semantics
- deterministic scheduling logic should not depend on parsing arbitrary recurrence expressions in the first implementation

### Current timetable import behavior

Phase 2 timetable import should validate the entire payload before writing entries.

Reasoning:

- imported timetable data feeds later notification behavior
- partial acceptance of malformed class schedules would create silent correctness risk
- strict validation keeps the import path understandable and testable

### UTC-consistent occurrence expansion

Phase 2 timetable occurrence expansion should use UTC-consistent weekday and time composition logic in the current implementation.

Reasoning:

- local-environment timezone leakage caused deterministic behavior to drift during testing
- shared scheduling logic needs one consistent baseline until full user-timezone-aware rendering is extended further

### Telegram chat binding for Phase 3

Phase 3 should treat persisted `User.telegramChatId` as the canonical delivery target.

Reasoning:

- delivery behavior should resolve through the application user record rather than a global runtime-only assumption
- Telegram callbacks need a durable identity bridge back into application state
- an environment chat id may still help bootstrap single-user development, but it should not be the long-term source of truth

### Notification deduplication model for Phase 3

Phase 3 should use explicit notification-event ledger records with stable occurrence keys and dedupe keys.

Reasoning:

- cron retries and repeated due-item scans must not create duplicate sends
- timetable alerts require occurrence-specific identity because timetable entries are recurring definitions rather than stored instances
- logging only successful deliveries is not sufficient for reliable retry handling; pending and failed states matter too

### Telegram quick-action scope for Phase 3

Phase 3 quick actions should support reminder completion, reminder snooze, and timetable alert acknowledgment.

Reasoning:

- reminder done and snooze are core user-value actions directly tied to notification usefulness
- timetable alerts benefit from lightweight acknowledgment without prematurely adding a heavier class-override system
- keeping timetable interaction narrower reduces correctness risk while the notification pipeline stabilizes

### Shared assistant execution path for Phase 4

Phase 4 should route web capture, web chat, Telegram natural-language input, and voice-derived text through one shared server-side assistant workflow.

Reasoning:

- reminder mutations should not diverge by interface
- clarification and rejection behavior should stay consistent across surfaces
- testing one workflow boundary is more robust than testing several nearly-identical feature-specific paths

### Grounding scope for Phase 4

Phase 4 assistant answers should be grounded in active reminders and timetable data only.

Reasoning:

- reminders and timetable are the deterministic product areas already implemented and tested
- notes and file retrieval are still a later-phase concern in the current roadmap
- limiting grounded context in Phase 4 keeps the first assistant layer accurate and understandable

### Minimal conversation persistence for Phase 4

Phase 4 should add dedicated conversation and conversation-message records rather than overloading `MemoryArtifact`.

Reasoning:

- chat history has a different access pattern from long-term summarization artifacts
- dedicated conversation storage keeps Phase 4 chat useful immediately while leaving room for deeper memory layering later
- this reduces schema ambiguity before the persistent memory phase formalizes summarization behavior

### Separate retrieval records for Phase 5

Phase 5 should store embeddings and chunked retrieval content in dedicated retrieval records instead of attaching vectors directly to `Note` and `StoredFile`.

Reasoning:

- chunk-based retrieval is more robust for long notes and extracted files
- reindexing and stale-index cleanup are cleaner when source records remain authoritative and retrieval records stay derived
- unified search across notes and files is easier to implement and validate through a shared retrieval table
- vector-specific SQL and indexing concerns should not complicate the primary source-record schema more than necessary

### Vector retrieval is mandatory for Phase 5 completion

Phase 5 should not be considered complete with keyword-only retrieval or an embedding-ready abstraction alone.

Reasoning:

- the roadmap explicitly scopes embeddings and semantic retrieval into this phase
- robust assistant retrieval over stored knowledge requires actual vector-backed search quality rather than only lexical matching
- delaying vector storage would produce a misleadingly partial knowledge-system phase

### Retrieval-backed memory for Phase 6

Phase 6 should index memory artifacts through the existing retrieval system instead of introducing a separate semantic memory path.

Reasoning:

- the retrieval subsystem introduced in Phase 5 already provides the right derived-record and provenance discipline
- semantic continuity across sessions is stronger when memory participates in the same retrieval substrate as notes and files
- a parallel memory-only search path would create duplicated ranking and indexing logic

### Token-aware context selection for Phase 6

Phase 6 should use deterministic token estimation and explicit context budgeting when assembling recent conversation, retrieval-backed knowledge, and memory summaries.

Reasoning:

- memory should improve continuity without crowding out deterministic reminder and timetable context
- explicit budgeting is easier to test and reason about than accidental prompt growth
- robust continuity requires graceful degradation rather than arbitrary truncation

### Memory artifacts remain derived from raw conversation history

Phase 6 should keep raw conversation persistence and memory summarization as separate layers.

Reasoning:

- raw messages and compressed summaries serve different access patterns
- explicit provenance over covered message ranges makes summarization idempotent and inspectable
- later summary promotion and backfill logic are cleaner when raw and derived layers remain distinct

### Priority levels

High, medium, and low are required.

### Organization

Both preset categories and custom tags are required.

### Timetable model

- semester/date-range aware
- weekly grid plus upcoming list
- JSON import through the web UI
- configurable notification timing
- manual edits for exceptions

### Dashboard sections

Required sections:

- today's agenda
- week-ahead preview
- inbox
- high-priority focus

### Completion behavior

Completed reminders should support strikethrough with hide option, and full history should exist.

### Export

JSON and CSV export are required.

Phase 7 should implement export as a deterministic server-side subsystem over primary user records.

Reasoning:

- backups should be generated from source-of-truth persisted data rather than route state
- JSON should preserve the richer personal backup story, including conversations and memory artifacts
- CSV should be reserved for flat datasets where spreadsheet-oriented review is meaningful

### Backup scope for Phase 7

Phase 7 should exclude retrieval chunks from the primary export while including user-meaningful conversation and memory records.

Reasoning:

- retrieval chunks are derived operational artifacts and can be rebuilt from notes, files, and memory source records
- conversations and memory artifacts remain important user-facing continuity records and should survive backup/restore workflows

### Operational route verification for Phase 7

Phase 7 should protect cron and Telegram webhook entry points with explicit shared-secret verification.

Reasoning:

- cron and webhook routes are production-critical operational surfaces rather than ordinary public endpoints
- secret verification reduces accidental or hostile invocation risk without complicating the core product model
- hardening these boundaries is part of making the system dependable enough for daily use

### PWA scope for Phase 7

Phase 7 should prioritize installability and safe caching over broad offline feature claims.

Reasoning:

- the application is heavily authenticated and dynamic, so pretending it is fully offline-capable would be misleading
- installability on iPhone and desktop is still valuable for everyday use
- conservative static caching reduces operational risk while improving launch ergonomics

### Mobile direction

The product should support a PWA experience.

### Theme

Dark mode first.

### Timezone

Fixed timezone rather than automatic detection.

## Open Questions

These are not blockers to documentation, but will need clearer technical decisions during implementation:

- exact summarization cadence and storage format for layered memory
- whether some AI tasks should use GitHub Copilot-backed access, local models, or direct provider APIs
- exact file text-extraction pipeline by MIME type
- exact `pgvector` enablement path in the provisioned PostgreSQL environment

Phase 3 implementation has now clarified that Telegram delivery can begin through direct Bot API HTTP boundaries in server-side routes without introducing a separate Telegram library first.
