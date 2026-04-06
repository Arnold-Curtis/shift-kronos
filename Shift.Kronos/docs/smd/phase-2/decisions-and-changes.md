# Phase 2 Decisions And Changes

This document records how implementation clarified the original planning documents during the scheduling and capture phase.

## Clarified Decisions

### Current-user persistence is required before meaningful feature work

Protected routes alone were not sufficient for Phase 2. The implementation now persists the authenticated Clerk identity into the application `User` model so reminders and timetable entries always resolve against a real application user record.

### Recurrence should be structured in the first deterministic implementation

The Phase 1 schema left room for a raw `recurrenceRule` field, but Phase 2 required stronger guarantees. The implementation now uses explicit recurrence frequency, interval, weekday, and end-date fields alongside a serialized recurrence payload.

### Dashboard sections should be composed from shared queries

The dashboard is now driven by shared reminder and timetable query logic rather than separate placeholder content. This keeps the app routes aligned on what counts as inbox work, high-priority focus, today agenda, and week-ahead data.

### Timetable import should be strict before delivery features arrive

Phase 2 import now validates the entire payload before persistence. This choice reduces the chance of malformed schedule data flowing into later notification work.

### Shared date logic needed stronger consistency than initially assumed

Implementation exposed timezone-sensitive drift in occurrence expansion. The shared date helpers were tightened to use UTC-consistent weekday and time composition logic for the current implementation baseline.

## Expected Future Revisions

- richer reminder editing and deletion flows
- deeper user-configurable timezone handling across rendering and scheduling boundaries
- delivery-specific due-item logic once Telegram reliability work begins in Phase 3
- more advanced recurrence handling if later requirements justify it
