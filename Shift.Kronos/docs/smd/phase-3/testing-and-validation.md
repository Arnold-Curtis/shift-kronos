# Phase 3 Testing And Validation

Phase 3 extends the testing posture from the first two phases into delivery reliability.

## Validation Gate

The milestone validation gate remains:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

All four commands are part of the definition of done for this phase.

## Phase 3 Coverage

Phase 3 adds automated checks for:

- effective due-occurrence selection for recurring reminders
- snooze suppression during reminder due checks
- reminder due-item construction and dedupe-key generation
- timetable due-item construction and notify-at calculation
- Telegram callback payload encoding and decoding
- Telegram message formatting for reminders and timetable alerts

## Reliability Notes

- notification events now store pending, delivered, and failed delivery states so retries can be handled with more explicit behavior
- timetable notifications rely on occurrence-specific identity rather than only timetable entry identity
- persisted `User.telegramChatId` is treated as the primary callback ownership bridge back into application state

## Ongoing Policy

Later phases must build on the Phase 3 delivery tests rather than bypassing them. Phase 4 in particular should reuse the same deterministic action and validation boundaries when AI-generated actions begin mutating reminders or timetable records.
