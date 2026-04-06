# Phase 6 Decisions And Changes

This document records how implementation clarified the original planning assumptions during the persistent memory phase.

## Clarified Decisions

### Memory should remain derived from raw conversation history

The implementation keeps `Conversation` and `ConversationMessage` as the raw interaction ledger and treats `MemoryArtifact` as a derived continuity layer with explicit provenance and coverage boundaries.

### Memory should reuse the existing retrieval subsystem

The implementation indexes memory artifacts through `RetrievalChunk` using `RetrievalSourceType.MEMORY`. This avoids creating a second semantic retrieval path and keeps ranking/indexing behavior structurally aligned with notes and files.

### Token-aware context assembly should stay deterministic

The implementation introduces explicit token estimation and budget-aware trimming for recent conversation and retrieval-backed evidence so memory cannot silently crowd out more authoritative deterministic context.

### Backfill support is part of robust rollout

The implementation includes a server-side backfill path for older conversations so persistent memory applies to existing chat history rather than only to new interactions.

## Expected Future Revisions

- richer higher-level summary promotion beyond level 1
- async/background memory processing if latency or scale demands it
- improved semantic ranking between note/file evidence and memory evidence
- more explicit user-facing observability over stored memory artifacts
