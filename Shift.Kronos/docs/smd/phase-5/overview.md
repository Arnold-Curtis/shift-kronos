# Phase 5 Overview

Phase 5 expands Shift.Kronos from reminders, timetable, and assistant interaction into a retrieval-backed knowledge system.

## Goal

Allow the user to store notes and files as first-class records, index them with embeddings, and retrieve them through grounded assistant interactions.

## Target Outcomes

- notes CRUD works from the web app
- file uploads persist metadata and extraction state
- supported files produce extracted text where possible
- notes and extracted file content are chunked, embedded, and stored for semantic retrieval
- assistant answers can use stored notes and files through the shared Phase 4 workflow
- indexing and extraction failures remain explicit rather than hidden
