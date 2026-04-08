import { ReminderPriority, ReminderType, RecurrenceFrequency } from "@prisma/client";
import {
  addHours,
  nextFriday,
  nextMonday,
  nextSaturday,
  nextSunday,
  nextThursday,
  nextTuesday,
  nextWednesday,
} from "date-fns";
import { AssistantAction, ASSISTANT_ACTION_TYPE, AssistantContext } from "@/lib/assistant/types";
import {
  addDaysInTimeZone,
  getWeekdayFromDate,
  getZonedParts,
  makeDateInTimeZone,
} from "@/lib/datetime";

function normalizeInput(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

function parseExplicitTime(lower: string) {
  const match = lower.match(/\b(?:at\s+)?(1[0-2]|0?[1-9])(?:(?::|\s)([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/i);

  if (!match) {
    return null;
  }

  const rawHour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3].toLowerCase().replace(/\./g, "");
  const normalizedHour = rawHour % 12;

  return {
    hour: meridiem === "pm" ? normalizedHour + 12 : normalizedHour,
    minute,
  };
}

function parseDefaultExplicitDueAt(input: string, now: Date, timezone: string) {
  const explicitTime = parseExplicitTime(input.toLowerCase());

  if (!explicitTime) {
    return null;
  }

  const zonedNow = getZonedParts(now, timezone);
  const todayAtTime = makeDateInTimeZone({
    year: zonedNow.year,
    month: zonedNow.month,
    day: zonedNow.day,
    hour: explicitTime.hour,
    minute: explicitTime.minute,
    second: 0,
    millisecond: 0,
  }, timezone);

  return todayAtTime.getTime() >= now.getTime()
    ? todayAtTime
    : toDateAtHour(now, 1, explicitTime.hour, explicitTime.minute, timezone);
}

function toDateAtHour(base: Date, dayOffset: number, hour: number, minute: number, timezone: string) {
  const next = addDaysInTimeZone(base, dayOffset, timezone);
  const zonedNext = getZonedParts(next, timezone);
  return makeDateInTimeZone({
    year: zonedNext.year,
    month: zonedNext.month,
    day: zonedNext.day,
    hour,
    minute,
    second: 0,
    millisecond: 0,
  }, timezone);
}

function parseRelativeDueAt(input: string, now: Date, timezone: string) {
  const lower = input.toLowerCase();
  const explicitTime = parseExplicitTime(lower);

  if (lower.includes("tomorrow")) {
    return toDateAtHour(now, 1, explicitTime?.hour ?? 9, explicitTime?.minute ?? 0, timezone);
  }

  if (lower.includes("tonight")) {
    return toDateAtHour(now, 0, explicitTime?.hour ?? 20, explicitTime?.minute ?? 0, timezone);
  }

  if (lower.includes("this evening")) {
    return toDateAtHour(now, 0, explicitTime?.hour ?? 18, explicitTime?.minute ?? 0, timezone);
  }

  if (lower.includes("in 1 hour")) {
    return addHours(now, 1);
  }

  return parseDefaultExplicitDueAt(input, now, timezone);
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

function parseWeekdayReference(input: string, now: Date, timezone: string) {
  const date = parseWeekdayReminder(input, now);
  return date ? getWeekdayFromDate(date, timezone) : null;
}

function parseRelativeDateReference(input: string, now: Date, timezone: string) {
  const lower = input.toLowerCase();

  if (lower.includes("tomorrow")) {
    return addDaysInTimeZone(now, 1, timezone);
  }

  if (lower.includes("today") || lower.includes("tonight") || lower.includes("this evening")) {
    return now;
  }

  return parseWeekdayReminder(lower, now);
}

function parseSemesterRange(input: string, now: Date, timezone: string) {
  const reference = parseRelativeDateReference(input, now, timezone);

  if (!reference) {
    return null;
  }

  const zonedReference = getZonedParts(reference, timezone);
  const semesterStart = makeDateInTimeZone({ year: zonedReference.year, month: zonedReference.month, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 }, timezone);
  const semesterEnd = makeDateInTimeZone({ year: zonedReference.year, month: zonedReference.month + 4, day: 0, hour: 0, minute: 0, second: 0, millisecond: 0 }, timezone);

  return {
    semesterStart,
    semesterEnd,
  };
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
    .replace(/^(?:at\s+)?\d{1,2}(?:(?::|\s)\d{2})?\s*(?:am|pm)\s+(?:saying|to|that i should)\s+/i, "")
    .replace(/^tomorrow\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\s+(?:that\s+i\s+should|to)\s+/i, "")
    .replace(/^tomorrow\s+(?:that\s+i\s+should|to)\s+/i, "")
    .replace(/^tonight\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\s+(?:that\s+i\s+should|to)\s+/i, "")
    .replace(/^tonight\s+(?:that\s+i\s+should|to)\s+/i, "")
    .replace(/^this evening\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\s+(?:that\s+i\s+should|to)\s+/i, "")
    .replace(/^this evening\s+(?:that\s+i\s+should|to)\s+/i, "")
    .replace(/\b(?:tomorrow|tonight|this evening)\b.*?\bthat i should\b\s*/i, "")
    .replace(/\b(?:tomorrow|tonight|this evening)\b.*?\bto\b\s*/i, "")
    .replace(/\b(?:saying|that says|saying that)\b\s*/i, "")
    .replace(/^that i should\s+/i, "")
    .replace(/^to\s+/i, "")
    .replace(/[.?!]+$/, "")
    .trim();

  return cleaned.slice(0, 160);
}

function extractTimetableSubject(input: string) {
  const cleaned = input
    .replace(/^add a timetable entry(?: for)?\s+/i, "")
    .replace(/^add timetable entry(?: for)?\s+/i, "")
    .replace(/^add a class(?: for)?\s+/i, "")
    .replace(/^add class(?: for)?\s+/i, "")
    .replace(/^put (?:this )?in my timetable(?: for)?\s+/i, "")
    .replace(/^schedule a class(?: for)?\s+/i, "")
    .replace(/^(?:tomorrow|today|tonight|this evening)\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\s+that i have\s+/i, "")
    .replace(/\b(?:tomorrow|today|tonight|this evening)\b.*?\bthat i have\b\s*/i, "")
    .replace(/^that i have\s+/i, "")
    .replace(/^i have\s+/i, "")
    .replace(/^a\s+/i, "")
    .replace(/\bclass\b[.?!]*$/i, "")
    .replace(/[.?!]+$/, "")
    .trim();

  return cleaned.slice(0, 160);
}

function looksLikeTimetableRequest(lower: string) {
  return (
    lower.startsWith("add a timetable entry") ||
    lower.startsWith("add timetable entry") ||
    lower.startsWith("add a class") ||
    lower.startsWith("add class") ||
    lower.startsWith("schedule a class") ||
    lower.includes("timetable entry") ||
    lower.includes(" in my timetable") ||
    (lower.includes("class") && (lower.includes("i have") || lower.includes("business communications")))
  );
}

function parseTimetableAction(input: string, context: AssistantContext): AssistantAction {
  const lower = input.toLowerCase();
  const timezone = context.timezone || "Africa/Nairobi";
  const explicitTime = parseExplicitTime(lower);
  const weekday = parseWeekdayReference(lower, context.now, timezone);
  const relativeDate = parseRelativeDateReference(lower, context.now, timezone);
  const subject = extractTimetableSubject(input);
  const semesterRange = parseSemesterRange(lower, context.now, timezone);

  if (!subject) {
    return {
      type: ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS,
      clarification: {
        missingFields: ["subject"],
        question: "What is the subject or title of this timetable class?",
      },
    };
  }

  if (!explicitTime) {
    return {
      type: ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS,
      clarification: {
        missingFields: ["startTime"],
        question: "What time does this class start? Please include an exact time such as 8am or 14:00.",
      },
    };
  }

  if (!lower.includes("until") && !lower.includes("ends at") && !lower.includes("end at") && !lower.includes("to ")) {
    return {
      type: ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS,
      clarification: {
        missingFields: ["endTime"],
        question: "What time does this class end? Timetable entries need both a start time and an end time.",
      },
    };
  }

  const endMatch = lower.match(/(?:until|ends at|end at|to)\s+(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/i);
  const endMeridiem = endMatch?.[3]?.toLowerCase().replace(/\./g, "") ?? null;
  const endHour = endMatch ? Number(endMatch[1]) % 12 + (endMeridiem === "pm" ? 12 : 0) : null;
  const endMinute = endMatch ? Number(endMatch[2] ?? "0") : 0;

  if (endHour === null) {
    return {
      type: ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS,
      clarification: {
        missingFields: ["endTime"],
        question: "What time does this class end? Timetable entries need both a start time and an end time.",
      },
    };
  }

  if (!weekday && !relativeDate) {
    return {
      type: ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS,
      clarification: {
        missingFields: ["dayOfWeek"],
        question: "Which day of the week should this class repeat on?",
      },
    };
  }

  if (!semesterRange) {
    return {
      type: ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS,
      clarification: {
        missingFields: ["semesterRange"],
        question: "What semester date range should I use for this recurring timetable entry?",
      },
    };
  }

  const startTime = `${String(explicitTime.hour).padStart(2, "0")}:${String(explicitTime.minute).padStart(2, "0")}`;
  const endTime = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;

  return {
    type: ASSISTANT_ACTION_TYPE.CREATE_TIMETABLE_ENTRY,
    confidence: "high",
    timetableEntry: {
      subject,
      dayOfWeek: weekday ?? getWeekdayFromDate(relativeDate ?? context.now, timezone),
      startTime,
      endTime,
      semesterStart: semesterRange.semesterStart,
      semesterEnd: semesterRange.semesterEnd,
      reminderLeadMinutes: 30,
    },
  };
}

function answerScheduleQuestion(input: string, context: AssistantContext): AssistantAction {
  const lower = input.toLowerCase();
  const timezone = context.timezone || "Africa/Nairobi";
  const currentTime = context.highIntegrityFacts.currentTime;

  if (
    lower.includes("what time is it") ||
    lower.includes("what is the time") ||
    lower.includes("time right now") ||
    lower === "time" ||
    lower === "current time"
  ) {
    return {
      type: ASSISTANT_ACTION_TYPE.ANSWER_QUESTION,
      answer: {
        summary: `The current time is ${currentTime.localTime} in ${timezone}.`,
        evidence: [`Local time: ${currentTime.localDateTime}`],
      },
    };
  }

  if (lower.includes("next class") || lower.includes("what class") || lower.includes("classes")) {
    const nextClass = context.highIntegrityFacts.nextClass;

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
        summary: `Your next class is ${nextClass.subject} at ${nextClass.timing.localTime}.`,
        evidence: [
          nextClass.location ? `Location: ${nextClass.location}` : "Location not set",
          `Starts ${nextClass.timing.localDateTime}`,
        ],
      },
    };
  }

  if (lower.includes("what do i have today") || lower.includes("what is due") || lower.includes("urgent")) {
    const dueReminders = context.highIntegrityFacts.activeReminders.slice(0, 5);

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
          reminder.timing
            ? `${reminder.title} at ${reminder.timing.localDateTime}`
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
    lower.includes("schedule") ||
    lower.includes("what time is it") ||
    lower.includes("what is the time") ||
    lower.includes("time right now") ||
    lower === "time" ||
    lower === "current time"
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

  if (looksLikeTimetableRequest(lower)) {
    return parseTimetableAction(normalized, context);
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
        question: "Do you want to create a reminder, add a timetable entry, or ask about your current schedule?",
      },
    };
  }

  const timezone = context.timezone || "Africa/Nairobi";
  const title = extractTitle(normalized);
  const dueAt = parseRelativeDueAt(lower, context.now, timezone);
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
