import { ReminderPriority, ReminderType, RecurrenceFrequency, RetrievalSourceType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { parseAssistantIntentHeuristically } from "@/lib/ai/heuristics";
import { ASSISTANT_ACTION_TYPE } from "@/lib/assistant/types";

const context = {
  timezone: "Africa/Lagos",
  now: new Date("2026-04-06T10:00:00.000Z"),
  activeReminders: [
    {
      id: "rem_1",
      title: "Finish report",
      dueAt: new Date("2026-04-06T18:00:00.000Z"),
      priority: ReminderPriority.HIGH,
      type: ReminderType.ONE_TIME,
      category: "work",
    },
  ],
  upcomingClasses: [
    {
      entryId: "class_1",
      subject: "Operating Systems",
      startsAt: new Date("2026-04-06T12:00:00.000Z"),
      location: "Hall A",
    },
  ],
  knowledgeHighlights: [
    {
      sourceType: RetrievalSourceType.NOTE,
      sourceId: "note_1",
      sourceTitle: "Revision strategy",
      content: "Focus on operating systems revision before Thursday.",
      score: 0.94,
    },
  ],
  memoryHighlights: [
    {
      artifactId: "mem_1",
      summaryLevel: 1,
      title: "Study continuity",
      content: "You previously said revision should start with operating systems and move to networks.",
      score: 0.89,
      sourceType: RetrievalSourceType.MEMORY,
    },
  ],
  recentConversation: [
    {
      id: "msg_1",
      role: "USER" as const,
      content: "Help me plan revision.",
      createdAt: new Date("2026-04-06T09:58:00.000Z"),
      tokenEstimate: 6,
    },
  ],
};

describe("assistant heuristic parsing", () => {
  it("creates a one-time reminder when enough scheduling detail is present", () => {
    const result = parseAssistantIntentHeuristically(
      "Remind me to submit the assignment tomorrow at 8pm",
      context,
    );

    expect(result.type).toBe(ASSISTANT_ACTION_TYPE.CREATE_REMINDER);

    if (result.type !== ASSISTANT_ACTION_TYPE.CREATE_REMINDER) {
      throw new Error("Expected create reminder action.");
    }

    expect(result.reminder.type).toBe(ReminderType.ONE_TIME);
    expect(result.reminder.dueAt?.toISOString()).toBe("2026-04-07T20:00:00.000Z");
    expect(result.reminder.tags).toContain("school");
  });

  it("treats direct set reminder phrasing as a reminder request", () => {
    const result = parseAssistantIntentHeuristically(
      "Set a reminder for tomorrow at 7am that I should brush my shoes.",
      context,
    );

    expect(result.type).toBe(ASSISTANT_ACTION_TYPE.CREATE_REMINDER);

    if (result.type !== ASSISTANT_ACTION_TYPE.CREATE_REMINDER) {
      throw new Error("Expected create reminder action.");
    }

    expect(result.reminder.title).toBe("brush my shoes");
    expect(result.reminder.dueAt?.toISOString()).toBe("2026-04-07T07:00:00.000Z");
  });

  it("asks for timetable-specific missing fields instead of reminder intent", () => {
    const result = parseAssistantIntentHeuristically(
      "Add a timetable entry for tomorrow at 8 a.m. that I have a business communications class.",
      context,
    );

    expect(result.type).toBe(ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS);

    if (result.type !== ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS) {
      throw new Error("Expected clarification action.");
    }

    expect(result.clarification.missingFields).toContain("endTime");
    expect(result.clarification.question).toContain("class end");
  });

  it("creates a timetable entry when a strict recurring class request includes required fields", () => {
    const result = parseAssistantIntentHeuristically(
      "Add a timetable entry for tomorrow at 8 a.m. to 10 a.m. that I have a business communications class.",
      context,
    );

    expect(result.type).toBe(ASSISTANT_ACTION_TYPE.CREATE_TIMETABLE_ENTRY);

    if (result.type !== ASSISTANT_ACTION_TYPE.CREATE_TIMETABLE_ENTRY) {
      throw new Error("Expected create timetable entry action.");
    }

    expect(result.timetableEntry.subject).toBe("business communications");
    expect(result.timetableEntry.dayOfWeek).toBe(2);
    expect(result.timetableEntry.startTime).toBe("08:00");
    expect(result.timetableEntry.endTime).toBe("10:00");
  });

  it("requests clarification when reminder timing is missing", () => {
    const result = parseAssistantIntentHeuristically("Remind me to submit the assignment", context);

    expect(result.type).toBe(ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS);

    if (result.type !== ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS) {
      throw new Error("Expected clarification action.");
    }

    expect(result.clarification.missingFields).toContain("dueAt");
  });

  it("answers grounded schedule questions from current context", () => {
    const result = parseAssistantIntentHeuristically("What is my next class?", context);

    expect(result.type).toBe(ASSISTANT_ACTION_TYPE.ANSWER_QUESTION);

    if (result.type !== ASSISTANT_ACTION_TYPE.ANSWER_QUESTION) {
      throw new Error("Expected answer action.");
    }

    expect(result.answer.summary).toContain("Operating Systems");
    expect(result.answer.evidence[0]).toContain("Hall A");
  });

  it("creates recurring reminders for repeated language", () => {
    const result = parseAssistantIntentHeuristically("Remind me every day to take vitamins", context);

    expect(result.type).toBe(ASSISTANT_ACTION_TYPE.CREATE_REMINDER);

    if (result.type !== ASSISTANT_ACTION_TYPE.CREATE_REMINDER) {
      throw new Error("Expected create reminder action.");
    }

    expect(result.reminder.type).toBe(ReminderType.RECURRING);
    expect(result.reminder.recurrence?.frequency).toBe(RecurrenceFrequency.DAILY);
  });

  it("answers note and file questions from retrieval-backed knowledge context", () => {
    const result = parseAssistantIntentHeuristically("What do my notes say about revision?", context);

    expect(result.type).toBe(ASSISTANT_ACTION_TYPE.ANSWER_QUESTION);

    if (result.type !== ASSISTANT_ACTION_TYPE.ANSWER_QUESTION) {
      throw new Error("Expected answer action.");
    }

    expect(result.answer.summary).toContain("Revision strategy");
    expect(result.answer.evidence[0]).toContain("Focus on operating systems revision");
  });

  it("can include memory evidence alongside retrieved knowledge", () => {
    const result = parseAssistantIntentHeuristically("What do you remember about my study plan?", context);

    expect(result.type).toBe(ASSISTANT_ACTION_TYPE.ANSWER_QUESTION);

    if (result.type !== ASSISTANT_ACTION_TYPE.ANSWER_QUESTION) {
      throw new Error("Expected answer action.");
    }

    expect(result.answer.evidence.some((item) => item.includes("Memory L1"))).toBe(true);
  });
});
