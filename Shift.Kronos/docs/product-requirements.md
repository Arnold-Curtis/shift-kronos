# Product Requirements

## Product Name

Shift.Kronos

## Product Summary

Shift.Kronos is a personal productivity system and AI-assisted second brain. Its core responsibility is helping a single user capture important information, structure it into useful forms, and reliably send timely notifications to the user's phone through Telegram.

The product starts from a grounded need: managing classes, deadlines, personal reminders, habits, and life admin without relying on memory alone. Over time, the product expands into a more intelligent assistant that can remember context, interpret natural language, search notes and files, and help the user act on what matters.

## Problem Statement

The user is managing school, development work, and personal responsibilities at the same time. Important information exists in many forms:

- class timetables
- one-off reminders
- recurring obligations
- notes
- uploaded documents
- ad hoc thoughts captured quickly on mobile

Existing tools split this across multiple apps or force rigid workflows. The result is unnecessary mental load and missed follow-through.

## Product Goal

Create a personal system that makes it hard to forget important things and easy to capture new ones.

## Primary User

Single-user first. This is initially a private system for one person, not a multi-tenant product.

## Core Use Cases

### 1. Timetable Notifications

The user uploads or pastes a timetable in a structured JSON format after extracting it with a vision-capable model. The app stores the schedule and sends Telegram reminders according to configurable notification timing.

### 2. Quick Reminders

The user quickly creates a reminder from the web UI, Telegram, or voice input. The app parses the intent, schedules the item, and later sends a notification.

### 3. Recurring Life Management

The user tracks repeated events such as assignments, meetings, chores, habits, or routines, and receives consistent reminders over time.

### 4. AI-Assisted Capture and Retrieval

The user speaks naturally, types naturally, or chats with the app. The AI translates those requests into structured actions the application can execute.

### 5. Second Brain Memory

The app keeps track of useful context over time, including reminders, notes, files, schedule context, and conversation summaries, so future interactions become more informed.

## Product Principles

### Progressive Disclosure

Simple tasks must remain simple. Common actions should be available immediately. Advanced workflows may involve more steps, but the interface must never force complexity onto basic use.

### Telegram as Delivery, App as Home Base

The web application is the primary interface. Telegram is the primary delivery channel and a useful secondary interaction layer.

### AI Is a Quality Multiplier, Not the Core Reliability Mechanism

The app must still work as a dependable reminder and timetable system even when AI features are limited, unavailable, or not used for a given action.

### Rich Enough to Be Useful

The product should avoid narrow scope that makes the user think, "I wish this app could handle this one thing." The direction is feature-rich, but structured carefully so usability stays high.

## Functional Requirements

### Reminder System

The system must support:

- one-time reminders
- recurring reminders
- habits
- countdowns
- configurable notification timing
- high, medium, and low priority
- preset categories
- custom tags
- completion state with strikethrough and optional hiding
- history of completed items
- inbox-style unscheduled items

### Timetable System

The system must support:

- semester-based timetable ranges with start and end dates
- weekly calendar view
- upcoming list view
- configurable reminder timing for classes
- importing timetable data through structured JSON pasted into the app
- manual edits when class timing changes for a given period

The current decision is not to build special holiday or auto-skip logic in the first implementation.

### Notes

The system must support:

- note creation and editing
- notes being available to AI context and retrieval
- future extension into richer knowledge capture

### Files

The system must support:

- file uploads
- stored metadata
- AI-searchable extracted text where possible
- file retrieval and reference during AI interactions

### Telegram Integration

The system must support:

- outbound Telegram notifications
- inline actions such as done and snooze
- natural-language quick add through Telegram chat
- chat-based interaction with the assistant

Telegram is secondary for management, not the main administrative interface.

### AI Interfaces

The system must support:

- in-app chat
- Telegram chat interaction
- background parsing of natural language input
- voice-driven interactions via transcription

### AI Actions

The assistant should be able to:

- create reminders
- modify existing reminders or timetable items
- answer questions about schedule and tasks
- provide contextual advice and prioritization
- help retrieve relevant notes and files

## Dashboard Requirements

The main dashboard should include:

- today's agenda
- week-ahead preview
- inbox for unscheduled items
- high-priority focus section

## Mobile Requirements

The app should ship as a PWA and work well from an iPhone home screen.

## Theme and UX Direction

- dark mode first
- fixed timezone set in profile or account context
- responsive mobile-first behavior for quick capture
- fast paths for frequent actions

## Data Export Requirements

The system should support:

- full JSON export
- CSV export

## AI and Memory Requirements

The product vision includes a persistent memory system as part of the MVP direction. The expected behavior is:

- recent context remains highly detailed
- older context is summarized in layers
- summaries remain available for future conversations
- application state such as schedule, active reminders, notes, and files can be selectively included in prompt context

This system should be designed so that detail degrades gradually over time rather than disappearing entirely.

## Non-Goals for Initial Build

These are not currently required in the first implementation unless development changes direction:

- multi-user support
- native mobile apps
- special holiday calendar logic
- advanced one-off class override engine

## Success Criteria

The product is successful if:

- the user can quickly create reminders in multiple ways
- timetable notifications are reliable
- Telegram delivery feels dependable and useful
- AI interactions reduce friction rather than add it
- the system becomes a trustworthy place to store and retrieve important life context
