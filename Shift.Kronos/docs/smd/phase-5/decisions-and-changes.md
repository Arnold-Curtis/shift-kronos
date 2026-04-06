# Phase 5 Decisions And Changes

This document records how implementation clarified the original planning assumptions during the notes, files, and retrieval phase.

## Clarified Decisions

### Retrieval should live in dedicated derived records

The implementation stores chunked retrieval content and embeddings in `RetrievalChunk` instead of placing vectors directly on `Note` and `StoredFile`. This keeps source records authoritative and makes reindexing, provenance, and chunk-level retrieval cleaner.

### Files need explicit extraction and indexing state

The implementation records extraction and indexing status separately on `StoredFile`. This keeps file lifecycle behavior observable instead of hiding failures behind an upload-only success path.

### Notes and files remain normal product features, not assistant-only context stores

The implementation turns both `/notes` and `/files` into real management surfaces. Retrieval enhances these records, but does not replace normal direct access.

### Vector retrieval required a provider boundary and a vector-specific SQL boundary

The implementation keeps embedding generation in `lib/ai/providers/embeddings.ts` and vector-query execution in `lib/retrieval/service.ts`. This prevents provider details and vector SQL from leaking into pages or source-record services.

## Expected Future Revisions

- stronger result ranking and hybrid retrieval tuning
- broader extraction support for more document types
- streaming or richer attribution in assistant knowledge answers
- background indexing and backfill orchestration if larger content volumes require it
- deeper integration with Phase 6 persistent memory and summary retrieval
