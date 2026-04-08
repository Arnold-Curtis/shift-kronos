import { ReminderPriority, ReminderType, RecurrenceFrequency, RetrievalSourceType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { parseAssistantIntentHeuristically } from "@/lib/ai/heuristics";
import { ASSISTANT_ACTION_TYPE, AssistantContext } from "@/lib/assistant/types";
import { buildFollowUpInput, buildStructuredFollowUpInput } from "@/lib/assistant/service";
import { extractRecentActions, resolveFollowUpTarget } from "@/lib/assistant/references";
import { generateStructuredAssistantAction } from "@/lib/ai/providers/text";
import { assistantParseResultSchema } from "@/lib/assistant/schemas";
import { formatDateTimeForModel, formatDateTimeLabel, formatTimeForModel, formatTimeLabel } from "@/lib/datetime";

const context = {
  timezone: "Africa/Nairobi",
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
  highIntegrityFacts: {
    currentTime: {
      utc: "2026-04-06T10:00:00.000Z",
      timezone: "Africa/Nairobi",
      localDateTime: "Mon, 6 Apr 2026 13:00 (Africa/Nairobi)",
      localDate: "Mon, 6 Apr 2026",
      localTime: "13:00",
      weekdayLocal: "Monday",
      isToday: true,
      isTomorrow: false,
      isPast: false,
      isUpcoming: true,
      minutesFromNow: 0,
    },
    nextClass: {
      entryId: "class_1",
      subject: "Operating Systems",
      location: "Hall A",
      timing: {
        utc: "2026-04-06T12:00:00.000Z",
        timezone: "Africa/Nairobi",
        localDateTime: "Mon, 6 Apr 2026 15:00 (Africa/Nairobi)",
        localDate: "Mon, 6 Apr 2026",
        localTime: "15:00",
        weekdayLocal: "Monday",
        isToday: true,
        isTomorrow: false,
        isPast: false,
        isUpcoming: true,
        minutesFromNow: 120,
      },
    },
    upcomingClasses: [
      {
        entryId: "class_1",
        subject: "Operating Systems",
        location: "Hall A",
        timing: {
          utc: "2026-04-06T12:00:00.000Z",
          timezone: "Africa/Nairobi",
          localDateTime: "Mon, 6 Apr 2026 15:00 (Africa/Nairobi)",
          localDate: "Mon, 6 Apr 2026",
          localTime: "15:00",
          weekdayLocal: "Monday",
          isToday: true,
          isTomorrow: false,
          isPast: false,
          isUpcoming: true,
          minutesFromNow: 120,
        },
      },
    ],
    nextReminder: {
      id: "rem_1",
      title: "Finish report",
      priority: ReminderPriority.HIGH,
      type: ReminderType.ONE_TIME,
      category: "work",
      timing: {
        utc: "2026-04-06T18:00:00.000Z",
        timezone: "Africa/Nairobi",
        localDateTime: "Mon, 6 Apr 2026 21:00 (Africa/Nairobi)",
        localDate: "Mon, 6 Apr 2026",
        localTime: "21:00",
        weekdayLocal: "Monday",
        isToday: true,
        isTomorrow: false,
        isPast: false,
        isUpcoming: true,
        minutesFromNow: 480,
      },
    },
    activeReminders: [
      {
        id: "rem_1",
        title: "Finish report",
        priority: ReminderPriority.HIGH,
        type: ReminderType.ONE_TIME,
        category: "work",
        timing: {
          utc: "2026-04-06T18:00:00.000Z",
          timezone: "Africa/Nairobi",
          localDateTime: "Mon, 6 Apr 2026 21:00 (Africa/Nairobi)",
          localDate: "Mon, 6 Apr 2026",
          localTime: "21:00",
          weekdayLocal: "Monday",
          isToday: true,
          isTomorrow: false,
          isPast: false,
          isUpcoming: true,
          minutesFromNow: 480,
        },
      },
    ],
    recentActions: [],
  },
};

describe("assistant heuristic parsing", () => {
  it("formats Nairobi-local time labels correctly", () => {
    const sample = new Date("2026-04-08T09:41:20.029Z");

    expect(formatTimeLabel(sample, "Africa/Nairobi")).toBe("12:41");
    expect(formatTimeForModel(sample, "Africa/Nairobi")).toBe("12:41");
    expect(formatDateTimeLabel(sample, "Africa/Nairobi")).toBe("Wed, Apr 8 at 12:41");
    expect(formatDateTimeForModel(sample, "Africa/Nairobi")).toContain("12:41");
    expect(formatDateTimeForModel(sample, "Africa/Nairobi")).toContain("Africa/Nairobi");
  });

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
    expect(result.reminder.dueAt?.toISOString()).toBe("2026-04-07T17:00:00.000Z");
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
    expect(result.reminder.dueAt?.toISOString()).toBe("2026-04-07T04:00:00.000Z");
  });

  it("parses explicit reminder times without relative words and supports spaced minute input", () => {
    const result = parseAssistantIntentHeuristically(
      "set a reminder for 10 51 pm saying testing telegram",
      context,
    );

    expect(result.type).toBe(ASSISTANT_ACTION_TYPE.CREATE_REMINDER);

    if (result.type !== ASSISTANT_ACTION_TYPE.CREATE_REMINDER) {
      throw new Error("Expected create reminder action.");
    }

    expect(result.reminder.title).toBe("testing telegram");
    expect(result.reminder.dueAt?.toISOString()).toBe("2026-04-06T19:51:00.000Z");
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

  it("merges a clarification reply with the prior user request for follow-up turns", () => {
    const effectiveInput = buildFollowUpInput("it starts at 8am ends at 10am", [
      {
        role: "USER",
        content: "Add a timetable entry for tomorrow at 8 a.m. that I have a business communications class.",
      },
      {
        role: "ASSISTANT",
        content: "What time does this class end? Timetable entries need both a start time and an end time.",
      },
    ]);

    expect(effectiveInput).toContain("Add a timetable entry for tomorrow at 8 a.m.");
    expect(effectiveInput).toContain("it starts at 8am ends at 10am");
  });

  it("does not merge follow-up input when the new turn already contains a standalone intent", () => {
    const effectiveInput = buildFollowUpInput("Add a reminder for tonight at 9pm to revise.", [
      {
        role: "USER",
        content: "Add a timetable entry for tomorrow at 8 a.m. that I have a business communications class.",
      },
      {
        role: "ASSISTANT",
        content: "What time does this class end? Timetable entries need both a start time and an end time.",
      },
    ]);

    expect(effectiveInput).toBe("Add a reminder for tonight at 9pm to revise.");
  });

  it("still merges short clarification fragments like bare times with the prior request", () => {
    const effectiveInput = buildFollowUpInput("11am", [
      {
        role: "USER",
        content: "Remind me to call mum tomorrow.",
      },
      {
        role: "ASSISTANT",
        content: "When should I schedule this reminder? You can say things like tomorrow at 8pm or tonight.",
      },
    ]);

    expect(effectiveInput).toContain("Remind me to call mum tomorrow.");
    expect(effectiveInput).toContain("11am");
  });

  it("merges repeated bare-time clarification fragments without treating them as standalone retrieval queries", () => {
    const effectiveInput = buildFollowUpInput("11AM 11am", [
      {
        role: "USER",
        content: "Remind me to call mum tomorrow.",
      },
      {
        role: "ASSISTANT",
        content: "When should I schedule this reminder? You can say things like tomorrow at 8pm or tonight.",
      },
    ]);

    expect(effectiveInput).toContain("Remind me to call mum tomorrow.");
    expect(effectiveInput).toContain("11AM 11am");
  });

  it("anchors timetable clarification replies to the original request instead of the latest bare fragment", () => {
    const effectiveInput = buildStructuredFollowUpInput("10am", [
      {
        role: "ASSISTANT" as const,
        content: "What time does this class end? Timetable entries need both a start time and an end time.",
        structuredData: {
          type: ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS,
          clarification: {
            missingFields: ["endTime"],
            question: "What time does this class end? Timetable entries need both a start time and an end time.",
          },
        },
      },
      {
        role: "USER" as const,
        content: "yes a timetable entry tomorrow at 8am",
        structuredData: null,
      },
    ]);

    expect(effectiveInput).toBe("yes a timetable entry tomorrow at 8am to 10am");
  });

  it("keeps the original timetable request anchored across repeated clarification loops", () => {
    const effectiveInput = buildStructuredFollowUpInput("10am", [
      {
        role: "ASSISTANT" as const,
        content: "What time does this class end? Timetable entries need both a start time and an end time.",
        structuredData: {
          type: ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS,
          clarification: {
            missingFields: ["endTime"],
            question: "What time does this class end? Timetable entries need both a start time and an end time.",
          },
        },
      },
      {
        role: "USER" as const,
        content: "10am",
        structuredData: {
          source: "web-chat",
          effectiveInput: "yes a timetable entry tomorrow at 8am to 10am",
        },
      },
      {
        role: "ASSISTANT" as const,
        content: "What time does this class end? Timetable entries need both a start time and an end time.",
        structuredData: {
          type: ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS,
          clarification: {
            missingFields: ["endTime"],
            question: "What time does this class end? Timetable entries need both a start time and an end time.",
          },
        },
      },
      {
        role: "USER" as const,
        content: "yes a timetable entry tomorrow at 8am",
        structuredData: null,
      },
    ]);

    expect(effectiveInput).toBe("yes a timetable entry tomorrow at 8am to 10am");
  });

  it("resolves reminder follow-up questions against the most recent assistant-created reminder", () => {
    const effectiveInput = buildStructuredFollowUpInput("when is it again?", [
      {
        role: "ASSISTANT" as const,
        content: "Created reminder: Submit assignment for 2026-04-07T20:00:00.000Z.",
        structuredData: {
          type: ASSISTANT_ACTION_TYPE.CREATE_REMINDER,
          confidence: "high",
          reminder: {
            title: "Submit assignment",
            type: "ONE_TIME",
            priority: "HIGH",
            tags: ["school"],
            dueAt: "2026-04-07T20:00:00.000Z",
          },
        },
      },
      {
        role: "USER" as const,
        content: "Remind me to submit the assignment tomorrow at 8pm",
        structuredData: null,
      },
    ]);

    expect(effectiveInput).toContain("Submit assignment");
    expect(effectiveInput).toContain("2026-04-07T20:00:00.000Z");
  });

  it("resolves timetable follow-up questions against the most recent assistant-created class", () => {
    const effectiveInput = buildStructuredFollowUpInput("when is that class again?", [
      {
        role: "ASSISTANT" as const,
        content: "Created timetable entry: business communications every Tuesday from 08:00 to 10:00, between Tue, Apr 7 and Mon, Aug 31.",
        structuredData: {
          type: ASSISTANT_ACTION_TYPE.CREATE_TIMETABLE_ENTRY,
          confidence: "high",
          timetableEntry: {
            subject: "business communications",
            dayOfWeek: 2,
            startTime: "08:00",
            endTime: "10:00",
            semesterStart: "2026-04-01T00:00:00.000Z",
            semesterEnd: "2026-08-31T00:00:00.000Z",
            reminderLeadMinutes: 30,
          },
        },
      },
      {
        role: "USER" as const,
        content: "yes a timetable entry tomorrow at 8am to 10am",
        structuredData: null,
      },
    ]);

    expect(effectiveInput).toContain("business communications");
    expect(effectiveInput).toContain("08:00");
    expect(effectiveInput).toContain("10:00");
  });

  it("sanitizes oversized clarification payloads instead of crashing schema validation", async () => {
    process.env.PHASE4_FAKE_AI = "0";
    process.env.OPENROUTER_API_KEY = "openrouter_api_key";
    process.env.OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
    process.env.OPENROUTER_HTTP_REFERER = "https://shift-kronos.test";
    process.env.OPENROUTER_TITLE = "Shift:Kronos";

    const originalFetch = global.fetch;

    global.fetch = async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  type: ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS,
                  clarification: {
                    missingFields: ["a", "b", "c", "d", "e", "f", "g", "g"],
                    question: "Need a few more details.",
                  },
                }),
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ) as Response;

    try {
      const result = await generateStructuredAssistantAction({
        input: "Help me schedule this.",
        context,
      });

      expect(result.type).toBe(ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS);

      if (result.type !== ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS) {
        throw new Error("Expected clarification action.");
      }

      expect(result.clarification.missingFields).toEqual(["a", "b", "c", "d", "e", "f"]);
      expect(result.clarification.question).toBe("Need a few more details.");
    } finally {
      global.fetch = originalFetch;
      process.env.PHASE4_FAKE_AI = "1";
    }
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
    expect(result.answer.summary).toContain("15:00");
    expect(result.answer.evidence[0]).toContain("Hall A");
    expect(result.answer.evidence[1]).not.toContain("T");
  });

  it("answers current time questions in the user timezone", () => {
    const result = parseAssistantIntentHeuristically("What time is it right now?", context);

    expect(result.type).toBe(ASSISTANT_ACTION_TYPE.ANSWER_QUESTION);

    if (result.type !== ASSISTANT_ACTION_TYPE.ANSWER_QUESTION) {
      throw new Error("Expected answer action.");
    }

    expect(result.answer.summary).toContain("13:00");
    expect(result.answer.summary).toContain("Africa/Nairobi");
    expect(result.answer.evidence[0]).not.toContain("T");
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

  it("accepts structured search actions from the assistant schema", () => {
    const result = assistantParseResultSchema.parse({
      type: ASSISTANT_ACTION_TYPE.SEARCH_MEMORY,
      query: "what classes do i have tomorrow",
      target: "SCHEDULE",
      timeContext: {
        dayOfWeek: 3,
      },
    });

    expect(result.type).toBe(ASSISTANT_ACTION_TYPE.SEARCH_MEMORY);
  });

  it("accepts timetable update actions from the assistant schema", () => {
    const result = assistantParseResultSchema.parse({
      type: ASSISTANT_ACTION_TYPE.UPDATE_TIMETABLE_ENTRY,
      confidence: "high",
      entryId: "entry_123",
      updates: {
        subject: "Chemistry",
      },
    });

    expect(result.type).toBe(ASSISTANT_ACTION_TYPE.UPDATE_TIMETABLE_ENTRY);
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

describe("follow-up entity resolution", () => {
  const baseContext: AssistantContext = {
    ...context,
    activeReminders: [
      {
        id: "rem_gym",
        title: "Go hit the gym",
        dueAt: new Date("2026-04-06T15:30:00.000Z"),
        priority: ReminderPriority.MEDIUM,
        type: ReminderType.ONE_TIME,
        category: null,
      },
      {
        id: "rem_report",
        title: "Finish report",
        dueAt: new Date("2026-04-06T18:00:00.000Z"),
        priority: ReminderPriority.HIGH,
        type: ReminderType.ONE_TIME,
        category: "work",
      },
    ],
    timetableEntries: [
      {
        id: "entry_it",
        subject: "IT Project I (Regular)",
        dayOfWeek: 1,
        startTime: "14:00",
        endTime: "17:00",
        location: null,
        semesterStart: null,
        semesterEnd: null,
      },
    ],
  };

  it("resolves 'change that to 6pm' to UPDATE_REMINDER when the last action created a reminder", () => {
    const contextWithTarget: AssistantContext = {
      ...baseContext,
      resolvedFollowUpTarget: {
        entityType: "REMINDER",
        entityId: "rem_gym",
        entityTitle: "Go hit the gym",
        suggestedAction: "UPDATE_REMINDER",
      },
    };

    const result = parseAssistantIntentHeuristically(
      "Could we change that to 6pm please?",
      contextWithTarget,
    );

    expect(result.type).toBe(ASSISTANT_ACTION_TYPE.UPDATE_REMINDER);

    if (result.type !== ASSISTANT_ACTION_TYPE.UPDATE_REMINDER) {
      throw new Error("Expected update_reminder action.");
    }

    expect(result.reminderId).toBe("rem_gym");
    expect(result.updates.dueAt).toBeInstanceOf(Date);
  });

  it("does NOT produce UPDATE_TIMETABLE_ENTRY when resolvedFollowUpTarget points to a reminder", () => {
    const contextWithTarget: AssistantContext = {
      ...baseContext,
      resolvedFollowUpTarget: {
        entityType: "REMINDER",
        entityId: "rem_gym",
        entityTitle: "Go hit the gym",
        suggestedAction: "UPDATE_REMINDER",
      },
    };

    const result = parseAssistantIntentHeuristically(
      "change it to 6pm",
      contextWithTarget,
    );

    expect(result.type).not.toBe(ASSISTANT_ACTION_TYPE.UPDATE_TIMETABLE_ENTRY);
    expect(result.type).toBe(ASSISTANT_ACTION_TYPE.UPDATE_REMINDER);
  });

  it("routes correction signals to the REMINDER domain", () => {
    const target = resolveFollowUpTarget(
      "no, I meant the reminder, change it to 6pm",
      [
        {
          actionType: "create_reminder",
          entityType: "REMINDER",
          entityId: "rem_gym",
          entityTitle: "Go hit the gym",
          localTimeDescription: "due 2026-04-06T15:30:00.000Z",
          turnIndex: 1,
        },
        {
          actionType: "update_timetable_entry",
          entityType: "TIMETABLE_ENTRY",
          entityId: "entry_it",
          entityTitle: "IT Project I (Regular)",
          localTimeDescription: "14:00-17:00",
          turnIndex: 2,
        },
      ],
      [{ id: "rem_gym", title: "Go hit the gym" }],
      [{ id: "entry_it", subject: "IT Project I (Regular)" }],
    );

    expect(target).not.toBeNull();
    expect(target!.entityType).toBe("REMINDER");
    expect(target!.entityId).toBe("rem_gym");
    expect(target!.suggestedAction).toBe("UPDATE_REMINDER");
  });

  it("routes 'change the reminder to 7pm' to REMINDER domain even when timetable was recently mutated", () => {
    const target = resolveFollowUpTarget(
      "change the reminder to 7pm",
      [
        {
          actionType: "update_timetable_entry",
          entityType: "TIMETABLE_ENTRY",
          entityId: "entry_it",
          entityTitle: "IT Project I (Regular)",
          localTimeDescription: "14:00-17:00",
          turnIndex: 1,
        },
        {
          actionType: "create_reminder",
          entityType: "REMINDER",
          entityId: "rem_gym",
          entityTitle: "Go hit the gym",
          localTimeDescription: "due 2026-04-06T15:30:00.000Z",
          turnIndex: 2,
        },
      ],
      [{ id: "rem_gym", title: "Go hit the gym" }],
      [{ id: "entry_it", subject: "IT Project I (Regular)" }],
    );

    expect(target).not.toBeNull();
    expect(target!.entityType).toBe("REMINDER");
    expect(target!.suggestedAction).toBe("UPDATE_REMINDER");
  });

  it("routes 'move my class to 9am' to TIMETABLE_ENTRY domain", () => {
    const target = resolveFollowUpTarget(
      "move my class to 9am",
      [
        {
          actionType: "create_reminder",
          entityType: "REMINDER",
          entityId: "rem_gym",
          entityTitle: "Go hit the gym",
          localTimeDescription: "",
          turnIndex: 1,
        },
      ],
      [{ id: "rem_gym", title: "Go hit the gym" }],
      [{ id: "entry_it", subject: "IT Project I (Regular)" }],
    );

    expect(target).not.toBeNull();
    expect(target!.entityType).toBe("TIMETABLE_ENTRY");
    expect(target!.suggestedAction).toBe("UPDATE_TIMETABLE_ENTRY");
  });

  it("resolves pronoun 'it' to the most recently mutated entity", () => {
    const target = resolveFollowUpTarget(
      "change it to 8pm",
      [
        {
          actionType: "create_reminder",
          entityType: "REMINDER",
          entityId: "rem_gym",
          entityTitle: "Go hit the gym",
          localTimeDescription: "due 2026-04-06T15:30:00.000Z",
          turnIndex: 1,
        },
      ],
      [{ id: "rem_gym", title: "Go hit the gym" }],
      [],
    );

    expect(target).not.toBeNull();
    expect(target!.entityType).toBe("REMINDER");
    expect(target!.entityId).toBe("rem_gym");
  });

  it("extracts recent actions from conversation structured data", () => {
    const actions = extractRecentActions(
      [
        {
          role: "USER" as import("@prisma/client").ConversationMessageRole,
          content: "Remind me to go to the gym at 5:30pm",
          structuredData: null,
        },
        {
          role: "ASSISTANT" as import("@prisma/client").ConversationMessageRole,
          content: "Created reminder: Go hit the gym",
          structuredData: {
            type: "create_reminder",
            confidence: "high",
            reminder: {
              title: "Go hit the gym",
              type: "ONE_TIME",
              priority: "MEDIUM",
              tags: [],
              dueAt: "2026-04-06T15:30:00.000Z",
            },
          },
        },
      ],
      "Africa/Nairobi",
    );

    expect(actions.length).toBe(1);
    expect(actions[0]!.entityType).toBe("REMINDER");
    expect(actions[0]!.entityTitle).toBe("Go hit the gym");
    expect(actions[0]!.actionType).toBe("create_reminder");
  });

  it("extracts both reminder and timetable update actions from conversation history", () => {
    const actions = extractRecentActions(
      [
        {
          role: "ASSISTANT" as import("@prisma/client").ConversationMessageRole,
          content: "Updated IT Project I: endTime changed.",
          structuredData: {
            type: "update_timetable_entry",
            confidence: "high",
            entryId: "entry_it",
            updates: { endTime: "18:00" },
          },
        },
        {
          role: "ASSISTANT" as import("@prisma/client").ConversationMessageRole,
          content: "Created reminder: Go hit the gym",
          structuredData: {
            type: "create_reminder",
            confidence: "high",
            reminder: {
              title: "Go hit the gym",
              type: "ONE_TIME",
              priority: "MEDIUM",
              tags: [],
              dueAt: "2026-04-06T15:30:00.000Z",
            },
          },
        },
      ],
      "Africa/Nairobi",
    );

    expect(actions.length).toBe(2);
    expect(actions[0]!.entityType).toBe("TIMETABLE_ENTRY");
    expect(actions[0]!.actionType).toBe("update_timetable_entry");
    expect(actions[1]!.entityType).toBe("REMINDER");
    expect(actions[1]!.actionType).toBe("create_reminder");
  });

  it("accepts update_reminder schema action", () => {
    const result = assistantParseResultSchema.parse({
      type: ASSISTANT_ACTION_TYPE.UPDATE_REMINDER,
      confidence: "high",
      reminderId: "rem_abc123",
      updates: {
        dueAt: "2026-04-08T15:00:00.000Z",
      },
    });

    expect(result.type).toBe(ASSISTANT_ACTION_TYPE.UPDATE_REMINDER);

    if (result.type !== ASSISTANT_ACTION_TYPE.UPDATE_REMINDER) {
      throw new Error("Expected update_reminder action.");
    }

    expect(result.reminderId).toBe("rem_abc123");
  });

  it("accepts update_note schema action", () => {
    const result = assistantParseResultSchema.parse({
      type: ASSISTANT_ACTION_TYPE.UPDATE_NOTE,
      confidence: "high",
      noteId: "note_abc123",
      updates: {
        content: "Updated content",
      },
    });

    expect(result.type).toBe(ASSISTANT_ACTION_TYPE.UPDATE_NOTE);

    if (result.type !== ASSISTANT_ACTION_TYPE.UPDATE_NOTE) {
      throw new Error("Expected update_note action.");
    }

    expect(result.noteId).toBe("note_abc123");
  });
});
