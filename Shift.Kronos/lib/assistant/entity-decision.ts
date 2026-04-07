interface EntityDecisionInput {
  input: string;
  isRecurring: boolean;
  hasSemesterContext: boolean;
  existingTimetableEntries: number;
}

export type EntityDecision = "REMINDER" | "TIMETABLE_ENTRY";

export function decideEntityType(input: EntityDecisionInput): EntityDecision {
  const lower = input.input.toLowerCase();

  const timetableKeywords = [
    "class", "lecture", "tutorial", "seminar", "lab",
    "semester", "course", "module",
  ];

  const reminderKeywords = [
    "remind me", "reminder", "don't forget", "remember to",
    "meeting", "appointment", "deadline", "due",
  ];

  const hasTimetableKeyword = timetableKeywords.some((kw) => lower.includes(kw));
  const hasReminderKeyword = reminderKeywords.some((kw) => lower.includes(kw));

  if (input.isRecurring && (hasTimetableKeyword || input.hasSemesterContext)) {
    return "TIMETABLE_ENTRY";
  }

  if (input.isRecurring) {
    return "REMINDER";
  }

  if (hasReminderKeyword) {
    return "REMINDER";
  }

  if (hasTimetableKeyword && input.existingTimetableEntries > 0) {
    return "TIMETABLE_ENTRY";
  }

  return "REMINDER";
}

export function detectRecurringPattern(input: string): {
  isRecurring: boolean;
  frequency?: "DAILY" | "WEEKLY" | "MONTHLY";
  daysOfWeek?: number[];
} {
  const lower = input.toLowerCase();

  if (lower.includes("every day") || lower.includes("daily")) {
    return { isRecurring: true, frequency: "DAILY" };
  }

  if (lower.includes("every week") || lower.includes("weekly")) {
    return { isRecurring: true, frequency: "WEEKLY" };
  }

  if (lower.includes("every month") || lower.includes("monthly")) {
    return { isRecurring: true, frequency: "MONTHLY" };
  }

  const dayPattern = /(?:every|on)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?/i;
  const dayMatch = lower.match(dayPattern);

  if (dayMatch) {
    const dayMap: Record<string, number> = {
      "monday": 1,
      "tuesday": 2,
      "wednesday": 3,
      "thursday": 4,
      "friday": 5,
      "saturday": 6,
      "sunday": 7,
    };

    return {
      isRecurring: true,
      frequency: "WEEKLY",
      daysOfWeek: [dayMap[dayMatch[1].toLowerCase()]],
    };
  }

  return { isRecurring: false };
}
