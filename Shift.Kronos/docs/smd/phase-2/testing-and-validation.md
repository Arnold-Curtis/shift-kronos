# Phase 2 Testing And Validation

Phase 2 extends the testing posture introduced in Phase 1. Reminder and timetable logic are correctness-sensitive, so this phase adds direct automated coverage for the deterministic rules introduced here.

## Validation Gate

The milestone validation gate remains:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

All four commands passed at the end of this phase.

## Phase 2 Coverage

Phase 2 adds automated checks for:

- reminder creation validation by type
- recurrence validation and helper behavior
- countdown day calculation
- timetable entry validation
- timetable import payload validation
- timetable weekly occurrence expansion
- dashboard aggregation over reminders and timetable data

## Important Reliability Note

During implementation, timetable occurrence expansion initially leaked local-environment timezone behavior. The shared date helpers were corrected to use UTC-consistent weekday and time composition logic so deterministic tests and runtime behavior aligned.

## Ongoing Policy

Later phases must continue building on these tests rather than bypassing them. Phase 3 in particular should add automated verification around due-item checks, Telegram delivery, deduplication, and quick actions.
