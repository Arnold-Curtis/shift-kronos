# Phase 2 Overview

Phase 2 turns Shift.Kronos from a protected shell into a working deterministic scheduling and capture application.

## Phase Goal

Build robust reminder and timetable features that are useful on their own and safe for later Telegram delivery and AI-assisted capture work.

## Target Outcomes

- persisted current-user resolution through Clerk and the `User` model
- reminder CRUD with explicit support for one-time, recurring, habit, countdown, and inbox reminder types
- structured recurrence validation
- timetable CRUD with strict JSON import validation
- weekly and upcoming timetable views
- dashboard sections backed by live reminder and timetable data
- cumulative automated tests covering deterministic reminder and timetable behavior

## Phase 2 Principle

This phase does not treat reminders and timetable work as page-level CRUD only. It establishes deterministic domain rules that later delivery and AI phases can safely consume.
