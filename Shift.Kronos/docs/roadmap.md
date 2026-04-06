# Roadmap

## Delivery Strategy

The current agreed direction is not a tiny MVP. The target is a fuller first release over roughly four to six weeks, while still building in a layered order so the core system stays stable.

## Phase 1: Foundation

Goal: establish the application shell, deployment path, and core data model.

### Deliverables

- initialize Next.js app with TypeScript and App Router
- configure Tailwind CSS with dark-first styling direction
- set up Clerk authentication
- provision PostgreSQL and Prisma
- add `pgvector` support plan
- configure Vercel Blob
- establish environment variable contract
- scaffold dashboard layout and navigation
- establish route protection boundary and initial project structure
- add baseline automated tests and verification commands

### Exit Criteria

- app deploys successfully to Vercel
- auth works
- database connection works
- base layout works on desktop and mobile
- lint, typecheck, test, and build all pass

### Phase 1 Status

Phase 1 foundation has now produced:

- repository-root Next.js application baseline
- protected route structure for major product areas
- typed environment validation
- Prisma schema foundation for users, reminders, timetable entries, notes, files, notification events, and memory artifacts
- baseline unit tests and documented validation workflow

Implementation detail and completion records live in `docs/smd/phase-1/`.

## Testing Requirement For Every Phase

Testing is part of the definition of done for Shift.Kronos.

Each phase must:

- add durable automated checks where applicable
- run the relevant validation at the end of implementation sessions
- fix discovered failures before considering the work complete, where feasible
- document unresolved issues explicitly when immediate resolution is not possible

The baseline validation gate for major milestones is:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Phase 2: Core Scheduling and Capture

Goal: make the app useful without depending heavily on advanced AI.

### Deliverables

- reminder CRUD
- support for one-time and recurring reminders
- support for habits and countdowns
- categories and tags
- timetable CRUD
- timetable JSON import
- weekly and upcoming timetable views
- inbox and high-priority dashboard sections

### Exit Criteria

- user can create and manage reminders from the UI
- user can import and manage timetable data
- dashboard reflects real stored data

### Phase 2 Status

Phase 2 has now produced:

- persisted current-user resolution against the `User` table
- deterministic reminder validation and CRUD foundations for one-time, recurring, habit, countdown, and inbox reminder types
- strict timetable validation for manual entry and JSON import
- weekly and upcoming timetable views backed by shared occurrence logic
- dashboard sections backed by live reminder and timetable data
- cumulative automated tests for reminder validation, recurrence helpers, timetable validation, occurrence expansion, and dashboard aggregation

Implementation detail and completion records live in `docs/smd/phase-2/`.

## Phase 3: Telegram and Notification Reliability

Goal: make Shift.Kronos dependable as a notification system.

### Deliverables

- Telegram bot setup
- outbound message formatting
- done and snooze inline actions
- cron-driven due item checks
- deduplication and notification logs
- configurable reminder timing for reminders and classes

### Exit Criteria

- reminders reach Telegram reliably
- classes can trigger alerts
- Telegram quick actions update application state correctly

### Phase 3 Status

Phase 3 has now produced:

- a dedicated notification domain layer for due-item selection, occurrence identity, and dedupe-key generation
- delivery coordination that merges reminder and timetable notifications before transport dispatch
- Telegram message formatting and outbound transport boundaries behind explicit server-side modules
- cron and Telegram callback endpoints for dispatch and inline quick actions
- notification event state tracking for pending, delivered, failed, and actioned workflows
- callback-driven reminder completion and snooze handling, plus timetable alert acknowledgment
- cumulative automated tests for due-item selection, callback encoding, and Telegram message formatting

Implementation detail and completion records live in `docs/smd/phase-3/`.

## Phase 4: AI Capture and Interaction

Goal: reduce friction in creating and querying information.

### Deliverables

- natural language parsing from web input
- Telegram natural language quick add
- voice input path using transcription
- structured AI output validation
- in-app chat interface
- assistant access to current schedule and active reminders

### Exit Criteria

- user can speak or type naturally and create useful records
- user can ask questions about schedule and reminders

### Phase 4 Status

Phase 4 has now produced:

- a dedicated assistant workflow that accepts natural-language input from web capture, web chat, Telegram messages, and a voice-transcript path
- explicit assistant action contracts for reminder creation, grounded answers, clarification requests, and safe rejection
- server-side assistant context assembly over active reminders and upcoming timetable occurrences
- conversation and conversation-message persistence for assistant interactions
- dashboard quick-capture UI and a first-class `/chat` route in the application shell
- Telegram inbound message handling that reuses the same validated workflow used by the web application
- cumulative automated tests for assistant intent parsing and schedule grounding behavior

Implementation detail and completion records live in `docs/smd/phase-4/`.

## Phase 5: Notes, Files, and Retrieval

Goal: expand Shift.Kronos from a reminder app into a personal knowledge system.

### Deliverables

- notes CRUD
- file upload and metadata storage
- extracted text pipeline where possible
- embeddings for notes and files
- semantic retrieval over stored knowledge

### Exit Criteria

- user can store notes and files
- assistant can retrieve relevant information from them

### Phase 5 Status

Phase 5 has now produced:

- first-class note creation, editing, listing, and deletion workflows backed by server-side validation
- blob-backed file upload with relational metadata, extraction state, and indexing state
- supported text extraction for text-like files and PDF documents, with explicit unsupported and failed states
- a dedicated `RetrievalChunk` index model for chunk-based semantic retrieval over notes and files
- mandatory embedding generation and vector-backed retrieval boundaries over stored knowledge
- assistant retrieval expansion that grounds note and file answers through the same shared workflow introduced in Phase 4
- cumulative automated checks for retrieval chunking, embedding provider behavior, retrieval env parsing, and knowledge-grounded assistant answers

Implementation detail and completion records live in `docs/smd/phase-5/`.

## Phase 6: Persistent Memory System

Goal: implement layered long-term conversational memory.

### Deliverables

- conversation storage
- token-aware context management
- summary generation pipeline
- multi-level summaries over older context
- retrieval and reinjection strategy for future sessions

### Exit Criteria

- recent interactions remain detailed
- older interactions remain available in compressed form
- the assistant shows continuity across sessions

### Phase 6 Status

Phase 6 has now produced:

- a dedicated memory domain for token estimation, summary-window selection, artifact persistence, and reinjection support
- provenance-rich `MemoryArtifact` records derived from persisted conversation history rather than prompt-only state
- token-aware assistant context assembly over recent conversation, retrieval-backed knowledge, and memory summaries
- semantic indexing of memory artifacts through the existing retrieval subsystem using explicit source typing
- assistant workflow integration that persists raw interactions first and then evaluates summarization/indexing in the shared server-side path
- a backfill path for existing conversation history and cumulative automated checks for memory selection and continuity behavior

Implementation detail and completion records live in `docs/smd/phase-6/`.

## Phase 7: Polishing and Operational Hardening

Goal: make the system feel reliable enough for everyday personal dependence.

### Deliverables

- PWA installability
- export flows for JSON and CSV
- better loading and error states
- responsive improvements
- logging and monitoring
- backup and migration discipline

### Exit Criteria

- app is comfortable to use daily on iPhone and desktop
- failures are observable and recoverable

### Phase 7 Status

Phase 7 has now produced:

- an authenticated export subsystem for full JSON backups and CSV exports over flat operational datasets
- structured operational logging and secret-verified route hardening for cron and Telegram webhook entry points
- explicit route-level loading and error states across the main product surfaces
- responsive refinements and pending-state feedback over dashboard, chat, reminders, timetable, notes, files, and settings
- installable PWA support with manifest metadata, generated icons, and conservative static-asset caching
- a real settings surface for operational guidance, backup flows, and delivery-state visibility
- cumulative automated checks for operational authorization, export shaping, env parsing, and full application validation

Implementation detail and completion records live in `docs/smd/phase-7/`.

## Later Opportunities

These are important, but should not block the first serious release:

- behavior pattern learning improvements
- predictive suggestions
- richer document understanding
- calendar integrations
- Google Drive integration if later needed
- native mobile app
- multi-user support
