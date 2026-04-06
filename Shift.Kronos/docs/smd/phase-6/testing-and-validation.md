# Phase 6 Testing And Validation

Phase 6 extends project validation from retrieval-backed knowledge into memory creation, selection, and reinjection.

## Validation Gate

The milestone validation gate remains:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

All four commands remain required for completion.

## Phase 6 Coverage

Phase 6 adds automated checks for:

- deterministic token estimation helpers
- memory summary-window selection rules
- memory-aware assistant heuristic behavior
- Phase 6 memory environment parsing
- continued regression coverage for reminders, timetable, notifications, retrieval, and assistant interaction

## Reliability Notes

- memory artifacts remain derived from raw conversation history and retain explicit provenance
- memory indexing is observable through explicit indexing state on `MemoryArtifact`
- conversation summarization remains idempotent at the covered-range level
- token-aware context trimming prevents memory from displacing more authoritative deterministic context
