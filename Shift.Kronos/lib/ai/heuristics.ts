import { ReminderPriority, ReminderType, RecurrenceFrequency } from "@prisma/client";
import { addDays, addHours, nextMonday, nextThursday, nextTuesday, nextWednesday, nextFriday, nextSaturday, nextSunday } from "date-fns";
import { AssistantAction, ASSISTANT_ACTION_TYPE, AssistantContext } from "@/lib/assistant/types";

function normalizeInput(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

function parseExplicitTime(lower: string) {
  const match = lower.match(/\b(?:at\s+)?(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i);

  if (!match) {
    return null;
  }

  const rawHour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3].toLowerCase();
  const normalizedHour = rawHour % 12;

  return {
    hour: meridiem === "pm" ? normalizedHour + 12 : normalizedHour,
    minute,
  };
}

function toDateAtHour(base: Date, dayOffset: number, hour: number, minute: number) {
  const next = addDays(base, dayOffset);
  return new Date(Date.UTC(
    next.getUTCFullYear(),
    next.getUTCMonth(),
    next.getUTCDate(),
    hour,
    minute,
    0,
    0,
  ));
}

function parseRelativeDueAt(input: string, now: Date) {
  const lower = input.toLowerCase();
  const explicitTime = parseExplicitTime(lower);

  if (lower.includes("tomorrow")) {
    return toDateAtHour(now, 1, explicitTime?.hour ?? 9, explicitTime?.minute ?? 0);
  }

  if (lower.includes("tonight")) {
    return toDateAtHour(now, 0, explicitTime?.hour ?? 20, explicitTime?.minute ?? 0);
  }

  if (lower.includes("this evening")) {
    return toDateAtHour(now, 0, explicitTime?.hour ?? 18, explicitTime?.minute ?? 0);
  }

  if (lower.includes("in 1 hour")) {
    return addHours(now, 1);
  }

  return null;
}

function parseWeekdayReminder(input: string, now: Date) {
  const lower = input.toLowerCase();

  if (lower.includes("monday")) {
    return nextMonday(now);
  }

  if (lower.includes("tuesday")) {
    return nextTuesday(now);
  }

  if (lower.includes("wednesday")) {
    return nextWednesday(now);
  }

  if (lower.includes("thursday")) {
    return nextThursday(now);
  }

  if (lower.includes("friday")) {
    return nextFriday(now);
  }

  if (lower.includes("saturday")) {
    return nextSaturday(now);
  }

  if (lower.includes("sunday")) {
    return nextSunday(now);
  }

  return null;
}

function extractTitle(input: string) {
  const cleaned = input
    .replace(/^remind me to\s+/i, "")
    .replace(/^remind me\s+/i, "")
    .replace(/^add reminder to\s+/i, "")
    .replace(/^create reminder to\s+/i, "")
    .replace(/^set a reminder to\s+/i, "")
    .replace(/^set a reminder for\s+/i, "")
    .replace(/^set reminder to\s+/i, "")
    .replace(/^set reminder for\s+/i, "")
    .replace(/^quick add\s+/i, "")
    .replace(/^tomorrow\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\s+(?:that\s+i\s+should|to)\s+/i, "")
    .replace(/^tomorrow\s+(?:that\s+i\s+should|to)\s+/i, "")
    .replace(/^tonight\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\s+(?:that\s+i\s+should|to)\s+/i, "")
    .replace(/^tonight\s+(?:that\s+i\s+should|to)\s+/i, "")
    .replace(/^this evening\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\s+(?:that\s+i\s+should|to)\s+/i, "")
    .replace(/^this evening\s+(?:that\s+i\s+should|to)\s+/i, "")
    .replace(/\b(?:tomorrow|tonight|this evening)\b.*?\bthat i should\b\s*/i, "")
    .replace(/\b(?:tomorrow|tonight|this evening)\b.*?\bto\b\s*/i, "")
    .replace(/^that i should\s+/i, "")
    .replace(/^to\s+/i, "")
    .replace(/[.?!]+$/, "")
    .trim();

  return cleaned.slice(0, 160);
}

function answerScheduleQuestion(input: string, context: AssistantContext): AssistantAction {
  const lower = input.toLowerCase();

  if (lower.includes("next class") || lower.includes("what class") || lower.includes("classes")) {
    const nextClass = context.upcomingClasses[0];

    if (!nextClass) {
      return {
        type: ASSISTANT_ACTION_TYPE.ANSWER_QUESTION,
        answer: {
          summary: "You do not have any upcoming classes in the current timetable window.",
          evidence: [],
        },
      };
    }

    return {
      type: ASSISTANT_ACTION_TYPE.ANSWER_QUESTION,
      answer: {
        summary: `Your next class is ${nextClass.subject}.`,
        evidence: [
          nextClass.location ? `Location: ${nextClass.location}` : "Location not set",
          `Starts at ${nextClass.startsAt.toISOString()}`,
        ],
      },
    };
  }

  if (lower.includes("what do i have today") || lower.includes("what is due") || lower.includes("urgent")) {
    const dueReminders = context.activeReminders.slice(0, 5);

    if (dueReminders.length === 0) {
      return {
        type: ASSISTANT_ACTION_TYPE.ANSWER_QUESTION,
        answer: {
          summary: "You do not have any active scheduled reminders in the current view.",
          evidence: [],
        },
      };
    }

    return {
      type: ASSISTANT_ACTION_TYPE.ANSWER_QUESTION,
      answer: {
        summary: `You currently have ${dueReminders.length} active scheduled reminder${dueReminders.length === 1 ? "" : "s"}.`,
        evidence: dueReminders.map((reminder) =>
          reminder.dueAt
            ? `${reminder.title} at ${reminder.dueAt.toISOString()}`
            : `${reminder.title} without a scheduled due time`,
        ),
      },
    };
  }

  return {
    type: ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS,
    clarification: {
      missingFields: ["question_scope"],
      question: "I can answer about reminders, upcoming classes, and current schedule. What would you like to know?",
    },
  };
}

function answerKnowledgeQuestion(context: AssistantContext): AssistantAction {
  const strongest = context.knowledgeHighlights[0];
  const strongestMemory = context.memoryHighlights[0];

  if (!strongest && !strongestMemory) {
    return {
      type: ASSISTANT_ACTION_TYPE.ANSWER_QUESTION,
      answer: {
        summary: "I could not find relevant notes, files, or conversation memory for that request.",
        evidence: [],
      },
    };
  }

  const evidence = context.knowledgeHighlights.map((item) => {
    const label = item.sourceType === "NOTE" ? "Note" : "File";
    return `${label}: ${item.sourceTitle} - ${item.content.slice(0, 180)}`;
  });

  const memoryEvidence = context.memoryHighlights.map((item) =>
    `Memory L${item.summaryLevel}: ${item.title ?? "Conversation summary"} - ${item.content.slice(0, 180)}`,
  );

  const leadTitle = strongest?.sourceTitle ?? strongestMemory?.title ?? "conversation memory";
  const leadKind = strongest ? (strongest.sourceType === "NOTE" ? "your notes" : "your files") : "your conversation memory";

  return {
    type: ASSISTANT_ACTION_TYPE.ANSWER_QUESTION,
    answer: {
      summary: `I found relevant stored knowledge in ${leadKind}, led by ${leadTitle}.`,
      evidence: [...evidence, ...memoryEvidence],
    },
  };
}

export function parseAssistantIntentHeuristically(input: string, context: AssistantContext): AssistantAction {
  const normalized = normalizeInput(input);
  const lower = normalized.toLowerCase();

  if (!normalized) {
    return {
      type: ASSISTANT_ACTION_TYPE.REJECT_REQUEST,
      reason: "A non-empty message is required.",
    };
  }

  if (
    lower.includes("what do i have") ||
    lower.includes("what is due") ||
    lower.includes("next class") ||
    lower.includes("classes") ||
    lower.includes("schedule")
  ) {
    return answerScheduleQuestion(normalized, context);
  }

  if (
    lower.includes("note") ||
    lower.includes("notes") ||
    lower.includes("file") ||
    lower.includes("document") ||
    lower.includes("documents") ||
    lower.includes("knowledge") ||
    lower.includes("remember") ||
    lower.includes("memory")
  ) {
    return answerKnowledgeQuestion(context);
  }

  const looksLikeReminder =
    lower.startsWith("remind me") ||
    lower.startsWith("set a reminder") ||
    lower.startsWith("set reminder") ||
    lower.startsWith("add reminder") ||
    lower.startsWith("create reminder") ||
    lower.startsWith("quick add");

  if (!looksLikeReminder) {
    return {
      type: ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS,
      clarification: {
        missingFields: ["intent"],
        question: "Do you want to create a reminder or ask about your current schedule?",
      },
    };
  }

  const title = extractTitle(normalized);
  const dueAt = parseRelativeDueAt(lower, context.now);
  const weekdayDueAt = parseWeekdayReminder(lower, context.now);
  const resolvedDueAt = dueAt ?? weekdayDueAt ?? undefined;
  const isRecurring = lower.includes("every day") || lower.includes("daily") || lower.includes("every week");

  if (!title) {
    return {
      type: ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS,
      clarification: {
        missingFields: ["title"],
        question: "What should I call this reminder?",
      },
    };
  }

  if (!resolvedDueAt && !isRecurring && !lower.includes("inbox")) {
    return {
      type: ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS,
      clarification: {
        missingFields: ["dueAt"],
        question: "When should I schedule this reminder? You can say things like tomorrow at 8pm or tonight.",
      },
    };
  }

  return {
    type: ASSISTANT_ACTION_TYPE.CREATE_REMINDER,
    confidence: resolvedDueAt || isRecurring ? "high" : "medium",
    reminder: {
      title,
      description: lower.includes("because") ? normalized : undefined,
      type: isRecurring ? ReminderType.RECURRING : resolvedDueAt ? ReminderType.ONE_TIME : ReminderType.INBOX,
      priority: lower.includes("urgent") || lower.includes("important") ? ReminderPriority.HIGH : ReminderPriority.MEDIUM,
      category: lower.includes("class") ? "school" : undefined,
      tags: lower.includes("assignment") ? ["school"] : [],
      dueAt: resolvedDueAt,
      recurrence: isRecurring
        ? {
            frequency: lower.includes("week") ? RecurrenceFrequency.WEEKLY : RecurrenceFrequency.DAILY,
            interval: 1,
            daysOfWeek: lower.includes("week") ? [1] : [],
          }
        : undefined,
    },
  };
}
