# Shift:Kronos

Shift:Kronos is a personal AI-powered reminder, timetable, notes, and memory system built around one practical outcome: making sure important things reliably reach you through Telegram.

This repository now contains both the foundational product documentation and the first seven implementation phases so development can continue from a working application rather than planning alone.

## Current State

Phase 7 polishing and operational hardening is now in place with:

- Next.js App Router application scaffold at the repository root
- TypeScript, Tailwind, ESLint, Vitest, and production build wiring
- dark-first responsive application shell
- protected application routes for dashboard, reminders, timetable, notes, files, and settings
- Clerk-backed current-user persistence into the `User` table
- Prisma schema and service boundaries for reminders and timetable entries
- typed environment validation
- Vercel Blob integration boundary
- deterministic reminder creation, grouping, completion, and recurrence validation
- deterministic timetable CRUD, JSON import validation, weekly view, and upcoming view
- dashboard sections backed by stored reminder and timetable data
- notification delivery selection across reminders and timetable occurrences
- Telegram transport formatting, callback handling, and cron dispatch endpoints
- notification deduplication, delivery state tracking, and callback action recording
- shared assistant orchestration for natural-language capture, grounded schedule answers, and validated reminder execution
- dashboard quick capture, in-app chat, Telegram inbound text handling, and a voice-to-transcript action path
- conversation and conversation-message persistence for assistant interactions
- first-class notes CRUD with semantic indexing state
- blob-backed file upload with extraction and indexing state
- dedicated retrieval chunk records for semantic search over notes and files
- vector-embedding generation and retrieval boundaries for grounded assistant knowledge access
- persistent conversation memory artifacts with provenance, coverage, and indexing state
- token-aware assistant context assembly over recent turns, retrieval-backed knowledge, and memory summaries
- retrieval-backed continuity across sessions through indexed memory artifacts
- authenticated JSON and CSV export flows over primary user records
- structured operational logging and secret-verified cron/webhook entry points
- route-level loading and error states across the major application surfaces
- stronger mobile ergonomics and pending-state handling for key forms and actions
- PWA installability through manifest metadata, icons, and safe static-asset caching
- settings as a real operational surface for backups and delivery posture
- Phase 1 completion records under `docs/smd/phase-1/`
- Phase 2 completion records under `docs/smd/phase-2/`
- Phase 3 completion records under `docs/smd/phase-3/`
- Phase 4 completion records under `docs/smd/phase-4/`
- Phase 5 completion records under `docs/smd/phase-5/`
- Phase 6 completion records under `docs/smd/phase-6/`
- Phase 7 completion records under `docs/smd/phase-7/`

## Documentation

- `docs/product-requirements.md`: product vision, problem statement, user goals, feature set, and UX principles
- `docs/architecture.md`: proposed system architecture, stack decisions, data model direction, and technical flows
- `docs/roadmap.md`: phased implementation roadmap from MVP to more advanced AI capabilities
- `docs/decisions.md`: key decisions made so far and the reasoning behind them
- `docs/smd/phase-1/overview.md`: Phase 1 goals and baseline outcomes
- `docs/smd/phase-1/implementation-summary.md`: Phase 1 implementation structure and rationale
- `docs/smd/phase-1/testing-and-validation.md`: quality gates and testing workflow
- `docs/smd/phase-1/decisions-and-changes.md`: implementation-driven clarifications and revisions
- `docs/smd/phase-2/overview.md`: Phase 2 goals and scheduling/capture outcomes
- `docs/smd/phase-2/implementation-summary.md`: Phase 2 implementation structure and rationale
- `docs/smd/phase-2/testing-and-validation.md`: deterministic scheduling and import test coverage
- `docs/smd/phase-2/decisions-and-changes.md`: implementation-driven clarifications and revisions for the domain layer
- `docs/smd/phase-3/overview.md`: Phase 3 goals and delivery reliability outcomes
- `docs/smd/phase-3/implementation-summary.md`: Phase 3 notification pipeline structure and rationale
- `docs/smd/phase-3/testing-and-validation.md`: delivery, callback, and dedupe coverage
- `docs/smd/phase-3/decisions-and-changes.md`: implementation-driven clarifications for Telegram delivery behavior
- `docs/smd/phase-4/overview.md`: Phase 4 goals and AI capture outcomes
- `docs/smd/phase-4/implementation-summary.md`: Phase 4 assistant workflow structure and rationale
- `docs/smd/phase-4/testing-and-validation.md`: capture, chat, and grounding coverage
- `docs/smd/phase-4/decisions-and-changes.md`: implementation-driven clarifications for AI workflow scope
- `docs/smd/phase-5/overview.md`: Phase 5 goals and knowledge-system outcomes
- `docs/smd/phase-5/implementation-summary.md`: Phase 5 notes/files/retrieval structure and rationale
- `docs/smd/phase-5/testing-and-validation.md`: semantic retrieval and indexing coverage
- `docs/smd/phase-5/decisions-and-changes.md`: implementation-driven clarifications for vector retrieval scope
- `docs/smd/phase-6/overview.md`: Phase 6 goals and memory-system outcomes
- `docs/smd/phase-6/implementation-summary.md`: Phase 6 memory architecture structure and rationale
- `docs/smd/phase-6/testing-and-validation.md`: continuity, token-budget, and memory coverage
- `docs/smd/phase-6/decisions-and-changes.md`: implementation-driven clarifications for retrieval-backed memory scope
- `docs/smd/phase-7/overview.md`: Phase 7 goals and operational-hardening outcomes
- `docs/smd/phase-7/implementation-summary.md`: Phase 7 export, PWA, observability, and UX hardening rationale
- `docs/smd/phase-7/testing-and-validation.md`: operational, export, and build validation coverage
- `docs/smd/phase-7/decisions-and-changes.md`: implementation-driven clarifications for backup/export and hardening scope

## Development Workflow

Testing is a mandatory completion gate for this project.

Every meaningful implementation session should end with the relevant validation commands:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

If a check fails, the work is not complete until the failure is fixed or explicitly documented.

## Current Product Direction

Shift:Kronos is intended to be:

- single-user first
- SQL-backed
- hosted on Vercel
- powered by Telegram notifications
- optimized for fast capture and reliable reminders
- progressively enhanced with AI chat, voice, memory, and semantic retrieval

## Initial Scope

The first documented scope includes:

- one-time reminders
- recurring reminders
- habits
- countdowns
- class timetable support
- notes
- file attachments
- Telegram quick actions
- AI-assisted input parsing
- a persistent memory system

## Product Principle

The core UX principle is progressive disclosure:

- common actions must be fast and obvious
- complex actions can exist, but should not burden everyday use

## Next Step

The next practical step after Phase 7 is selective post-hardening follow-through:

1. deployed-environment verification of cron secret routing and Telegram webhook secret configuration
2. ongoing backup discipline using the new full JSON export path
3. optional future monitoring-provider integration behind the new observability boundary
4. later-phase product expansion only after the hardened baseline remains stable
