# Phase 7 Decisions And Changes

This document records how implementation clarified the original planning assumptions during the polishing and operational hardening phase.

## Clarified Decisions

### Full backup should prioritize primary records over derived retrieval artifacts

The implementation includes `User`, reminders, timetable entries, notes, stored-file metadata, conversations, conversation messages, memory artifacts, and notification events in full JSON export, while excluding retrieval chunks from the main backup artifact.

### CSV export should stay intentionally narrow

The implementation supports CSV only for flat datasets where spreadsheet-oriented review is sensible: reminders, timetable entries, notes, and notification events. Richer nested records remain available through JSON.

### Operational routes need explicit verification, not just app-level auth assumptions

The implementation introduces shared-secret verification for cron routes and the Telegram webhook route so production-critical entry points are hardened independently of normal in-app navigation flows.

### PWA support should be honest about offline scope

The implementation enables installability and conservative static caching, but does not pretend that authenticated dynamic product surfaces are fully offline-capable.

### Settings should become an operations surface in this phase

The implementation promotes settings from placeholder status into a practical location for exports, backup guidance, and delivery-state visibility rather than leaving operational controls fragmented or undocumented.

## Expected Future Revisions

- optional third-party monitoring integration behind the new observability boundary
- richer settings management for timezone, Telegram linkage, and profile editing
- restore/import workflows if backup restoration becomes a first-class product requirement
- deeper mobile-specific interaction refinement after more real-world usage
