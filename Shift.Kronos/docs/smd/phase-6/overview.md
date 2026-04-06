# Phase 6 Overview

Phase 6 implements the persistent memory system for Shift.Kronos.

## Goal

Preserve conversational continuity across sessions without weakening deterministic grounding over reminders, timetable data, notes, and files.

## Outcomes

- conversation history remains persisted in raw form through `Conversation` and `ConversationMessage`
- older conversation windows can be summarized into provenance-rich `MemoryArtifact` records
- memory artifacts are indexed through the same retrieval subsystem used by notes and files
- assistant context assembly now combines deterministic product context, retrieval-backed knowledge, recent raw conversation turns, and relevant memory summaries
- context assembly now includes explicit token-budget-aware trimming for recent conversation and retrieved evidence
- existing conversations can be backfilled into the memory system through a dedicated server-side path
