# Phase 3 Decisions And Changes

This document records how implementation clarified the original planning assumptions during the Telegram and notification reliability phase.

## Clarified Decisions

### Persisted Telegram chat binding should be primary

The implementation now resolves Telegram callback ownership through `User.telegramChatId`. A global environment chat id remains useful only as a bootstrap fallback for outbound delivery in single-user setups.

### Notification dedupe needs occurrence identity, not just source-record identity

Reminder and timetable notifications now use occurrence-scoped keys. This was necessary because repeated cron checks and timetable recurrence would otherwise make duplicate suppression too weak.

### Notification event logging needed explicit status fields

The original schema had a lighter notification-event shape, but robust delivery required explicit pending, delivered, and failed states along with provider metadata and callback action timestamps.

### Timetable quick actions should remain narrower than reminder quick actions in Phase 3

Reminder notifications now support done and snooze actions. Timetable notifications currently support acknowledgment only, which preserves delivery usefulness without introducing a heavier class-override or attendance-state model too early.

## Expected Future Revisions

- stronger authentication or verification on cron-triggered dispatch routes
- richer Telegram message updates after callback actions
- fuller user-facing Telegram linking controls in settings
- more explicit recurring-occurrence completion persistence if later product behavior needs a deeper audit trail
