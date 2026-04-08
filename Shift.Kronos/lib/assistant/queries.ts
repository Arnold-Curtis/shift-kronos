import { db } from "@/lib/db";
import { QueryTarget, AssistantAction, ASSISTANT_ACTION_TYPE, AssistantTimeContext } from "@/lib/assistant/types";
import { runSemanticRetrieval } from "@/lib/retrieval/service";
import { RetrievalSourceType } from "@prisma/client";
import { formatDateLabel, formatTimeLabel } from "@/lib/datetime";

interface SearchParams {
  userId: string;
  query: string;
  target: QueryTarget;
  timeContext?: AssistantTimeContext;
}

export interface SearchResult {
  summary: string;
  evidence: string[];
  sources: Array<{
    type: string;
    id: string;
    title: string;
  }>;
  suggestedActions?: AssistantAction[];
}

export async function executeSearchMemory(params: SearchParams): Promise<SearchResult> {
  const { userId, query, target, timeContext } = params;

  switch (target) {
    case "SCHEDULE":
      return searchSchedule(userId, query, timeContext);
    case "MEMORY":
      return searchMemoryArtifacts(userId, query);
    case "REMINDERS":
      return searchReminders(userId, query, timeContext);
    case "NOTES":
      return searchNotes(userId, query);
    case "ALL":
      return searchAll(userId, query);
    default:
      return {
        summary: "I couldn't understand your query.",
        evidence: [],
        sources: [],
      };
  }
}

async function searchSchedule(
  userId: string,
  query: string,
  timeContext?: AssistantTimeContext,
): Promise<SearchResult> {
  const now = new Date();
  const evidence: string[] = [];
  const sources: SearchResult["sources"] = [];

  const timetableQuery: Record<string, unknown> = { userId };

  if (timeContext?.dayOfWeek) {
    timetableQuery.dayOfWeek = timeContext.dayOfWeek;
  }

  const timetableEntries = await db.timetableEntry.findMany({
    where: timetableQuery,
    orderBy: { startTime: "asc" },
  });

  let matchingEntries = timetableEntries;
  if (timeContext?.timeRange) {
    const { start, end } = timeContext.timeRange;
    matchingEntries = timetableEntries.filter((entry) => {
      return entry.startTime >= start && entry.startTime <= end;
    });
  }

  if (timeContext?.date) {
    const targetDate = timeContext.date;
    const dayOfWeek = targetDate.getDay() || 7;

    const entriesOnDay = matchingEntries.filter((e) => e.dayOfWeek === dayOfWeek);

    if (entriesOnDay.length > 0) {
      entriesOnDay.forEach((entry) => {
        evidence.push(`${entry.subject} at ${entry.startTime}${entry.location ? ` in ${entry.location}` : ""}`);
        sources.push({
          type: "TIMETABLE_ENTRY",
          id: entry.id,
          title: entry.subject,
        });
      });

      const firstEntry = entriesOnDay[0];
      const formattedDate = formatDateLabel(targetDate);

      return {
        summary: `On ${formattedDate}, you have ${firstEntry.subject} at ${firstEntry.startTime}${firstEntry.location ? ` in ${firstEntry.location}` : ""}.`,
        evidence,
        sources,
        suggestedActions: [
          {
            type: ASSISTANT_ACTION_TYPE.CREATE_REMINDER,
            confidence: "medium",
            reminder: {
              title: `Prepare for ${firstEntry.subject}`,
              type: "ONE_TIME",
              priority: "MEDIUM",
              tags: [],
            },
          } as AssistantAction,
        ],
      };
    }
  }

  if (matchingEntries.length > 0) {
    matchingEntries.slice(0, 3).forEach((entry) => {
      const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      evidence.push(`${entry.subject} on ${dayNames[entry.dayOfWeek - 1]} at ${entry.startTime}`);
      sources.push({
        type: "TIMETABLE_ENTRY",
        id: entry.id,
        title: entry.subject,
      });
    });

    return {
      summary: `Your next classes are: ${evidence.slice(0, 2).join(", ")}.`,
      evidence,
      sources,
    };
  }

  const reminders = await db.reminder.findMany({
    where: {
      userId,
      status: "ACTIVE",
      dueAt: timeContext?.date
        ? {
            gte: new Date(timeContext.date.setHours(0, 0, 0, 0)),
            lt: new Date(timeContext.date.setHours(23, 59, 59, 999)),
          }
        : { gte: now },
    },
    orderBy: { dueAt: "asc" },
    take: 5,
  });

  if (reminders.length > 0) {
    reminders.forEach((reminder) => {
      evidence.push(`${reminder.title}${reminder.dueAt ? ` at ${formatTimeLabel(reminder.dueAt)}` : ""}`);
      sources.push({
        type: "REMINDER",
        id: reminder.id,
        title: reminder.title,
      });
    });

    return {
      summary: `You have ${reminders.length} reminder(s): ${evidence.join(", ")}.`,
      evidence,
      sources,
    };
  }

  return {
    summary: "You don't have any scheduled items matching that query.",
    evidence: [],
    sources: [],
  };
}

async function searchMemoryArtifacts(userId: string, query: string): Promise<SearchResult> {
  const results = await runSemanticRetrieval({
    userId,
    query,
    limit: 5,
    sourceTypes: [RetrievalSourceType.MEMORY],
  });

  if (results.length === 0) {
    const memories = await db.memoryArtifact.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 5,
    });

    if (memories.length === 0) {
      return {
        summary: `I couldn't find any memory related to "${query}".`,
        evidence: [],
        sources: [],
      };
    }

    return {
      summary: `I found ${memories.length} memory item(s) related to "${query}".`,
      evidence: memories.map((m) => m.content.slice(0, 150)),
      sources: memories.map((m) => ({
        type: "MEMORY",
        id: m.id,
        title: m.title || "Memory",
      })),
    };
  }

  return {
    summary: `I found relevant memory about "${query}".`,
    evidence: results.map((r) => r.content.slice(0, 150)),
    sources: results.map((r) => ({
      type: r.sourceType,
      id: r.sourceId,
      title: r.sourceTitle || "Memory",
    })),
  };
}

async function searchReminders(
  userId: string,
  query: string,
  timeContext?: AssistantTimeContext,
): Promise<SearchResult> {
  const now = new Date();

  const whereClause: Record<string, unknown> = {
    userId,
    status: "ACTIVE",
  };

  if (timeContext?.date) {
    whereClause.dueAt = {
      gte: new Date(timeContext.date.setHours(0, 0, 0, 0)),
      lt: new Date(timeContext.date.setHours(23, 59, 59, 999)),
    };
  } else {
    whereClause.dueAt = { gte: now };
  }

  const reminders = await db.reminder.findMany({
    where: whereClause,
    orderBy: { dueAt: "asc" },
    take: 10,
  });

  if (reminders.length === 0) {
    return {
      summary: "You don't have any active reminders matching that query.",
      evidence: [],
      sources: [],
    };
  }

  return {
    summary: `You have ${reminders.length} active reminder(s).`,
    evidence: reminders.map((r) =>
      `${r.title}${r.dueAt ? ` (due ${formatDateLabel(r.dueAt)} at ${formatTimeLabel(r.dueAt)})` : ""}`
    ),
    sources: reminders.map((r) => ({
      type: "REMINDER",
      id: r.id,
      title: r.title,
    })),
  };
}

async function searchNotes(userId: string, query: string): Promise<SearchResult> {
  const results = await runSemanticRetrieval({
    userId,
    query,
    limit: 5,
    sourceTypes: [RetrievalSourceType.NOTE, RetrievalSourceType.FILE],
  });

  if (results.length === 0) {
    const notes = await db.note.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 5,
    });

    if (notes.length === 0) {
      return {
        summary: `I couldn't find any notes matching "${query}".`,
        evidence: [],
        sources: [],
      };
    }

    return {
      summary: `Found ${notes.length} note(s) matching "${query}".`,
      evidence: notes.map((n) => `${n.title}: ${n.content.slice(0, 100)}`),
      sources: notes.map((n) => ({
        type: "NOTE",
        id: n.id,
        title: n.title,
      })),
    };
  }

  return {
    summary: `Found relevant notes for "${query}".`,
    evidence: results.map((r) => `${r.sourceTitle}: ${r.content.slice(0, 100)}`),
    sources: results.map((r) => ({
      type: r.sourceType,
      id: r.sourceId,
      title: r.sourceTitle || "Note",
    })),
  };
}

async function searchAll(userId: string, query: string): Promise<SearchResult> {
  const [schedule, memory, reminders, notes] = await Promise.all([
    searchSchedule(userId, query),
    searchMemoryArtifacts(userId, query),
    searchReminders(userId, query),
    searchNotes(userId, query),
  ]);

  const allEvidence = [
    ...schedule.evidence,
    ...memory.evidence,
    ...reminders.evidence,
    ...notes.evidence,
  ];

  const allSources = [
    ...schedule.sources,
    ...memory.sources,
    ...reminders.sources,
    ...notes.sources,
  ];

  if (allEvidence.length === 0) {
    return {
      summary: `I couldn't find anything related to "${query}".`,
      evidence: [],
      sources: [],
    };
  }

  return {
    summary: `Found ${allSources.length} item(s) related to "${query}" across your schedule, memory, reminders, and notes.`,
    evidence: allEvidence.slice(0, 10),
    sources: allSources.slice(0, 10),
  };
}
