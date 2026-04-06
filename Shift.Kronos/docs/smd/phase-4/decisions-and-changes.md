# Phase 4 Decisions And Changes

This document records how implementation clarified the original planning assumptions during the AI capture and interaction phase.

## Clarified Decisions

### One shared workflow should own assistant execution

The implementation now routes dashboard quick capture, web chat, Telegram inbound text, and voice-derived text through one server-side assistant workflow. This keeps reminder mutation, clarification, and grounded answering behavior aligned.

### Conversation persistence needed dedicated tables before long-term memory work

The implementation introduced `Conversation` and `ConversationMessage` instead of overloading `MemoryArtifact`. This keeps chat history usable now without precommitting to the deeper summary model planned for later phases.

### Deterministic fallback behavior is still valuable in an AI phase

The current implementation includes a deterministic fallback parser at the provider boundary. This preserves development-time reliability and keeps tests grounded while fuller provider integration evolves.

### Grounded assistant scope remains intentionally narrow in Phase 4

The assistant currently grounds answers in active reminders and timetable data only. Notes/files retrieval remains deferred so the first interactive layer can stay reliable and understandable.

## Expected Future Revisions

- real provider-backed structured generation behind the existing `lib/ai/` boundary
- richer chat UX such as conversation switching and streaming responses
- binary audio upload and provider-backed speech transcription instead of text-like transcript submission
- reminder update and timetable mutation actions once the action contract expands safely
- retrieval expansion into notes and files during later phases
