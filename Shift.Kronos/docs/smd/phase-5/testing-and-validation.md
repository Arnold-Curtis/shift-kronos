# Phase 5 Testing And Validation

Phase 5 extends the project validation posture from assistant interaction into retrieval-backed knowledge operations.

## Validation Gate

The milestone validation gate remains:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

All four commands remain part of the definition of done for this phase.

## Phase 5 Coverage

Phase 5 adds automated checks for:

- retrieval chunking determinism and chunk metadata generation
- embedding-provider behavior in deterministic test mode
- Phase 5 retrieval environment parsing
- assistant answers grounded in retrieval-backed note/file context
- continued regression coverage for reminders, timetable, notifications, environment parsing, and Phase 4 assistant behavior

## Reliability Notes

- vector retrieval is implemented as a first-class subsystem rather than a best-effort enhancement
- notes and files persist explicit extraction/indexing state so failures are observable
- retrieval chunks are derived from source records and can be replaced atomically at the source-record level
- assistant retrieval reuses the same validated workflow boundary introduced in Phase 4 rather than bypassing it

## Ongoing Policy

Later phases should extend this retrieval system rather than bypass it. Persistent memory and summary reinjection should build on the explicit retrieval and provenance discipline introduced here.
