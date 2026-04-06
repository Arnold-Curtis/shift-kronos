# Phase 1 Testing And Validation

Testing is part of completion for Shift.Kronos. Code is not considered finished when it compiles locally once. It is considered finished when the relevant validation has been run and any failures have been resolved or documented.

## Baseline Validation Gate

Every implementation session should end with the relevant subset of these checks, and major milestones should run all of them:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Phase 1 Coverage

Phase 1 starts the testing discipline with checks for:

- environment contract validation
- shared utility behavior
- application buildability
- type safety
- lint cleanliness

## Ongoing Policy

Later phases must add tests cumulatively rather than postponing them. Reminder logic, timetable import, recurrence handling, notification delivery, deduplication, Telegram quick actions, and AI output validation should all ship with automated verification as they are introduced.
