import { db } from "@/lib/db";
import { getReminderCollections } from "@/lib/reminders/service";
import { getTimetableCollections } from "@/lib/timetable/service";
import { AssistantContext, AssistantTimetableEntryContext, SemesterContext } from "@/lib/assistant/types";
import { runSemanticRetrieval } from "@/lib/retrieval/service";
import { getServerEnv } from "@/lib/env";
import { getMemoryHighlights, getRecentConversationTurns } from "@/lib/memory/service";
import { estimateTokenCountForMessages } from "@/lib/memory/tokens";
import { logWarn } from "@/lib/observability/logger";
import { MemoryHighlight } from "@/lib/memory/types";
import { RetrievalMatch } from "@/lib/retrieval/types";
import { addDaysInTimeZone, formatDateForModel, formatDateTimeForModel, formatTimeForModel } from "@/lib/datetime";

function getWeekdayLabel(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: timezone, weekday: "long" }).format(date);
}

function buildDerivedTimeFact(date: Date, now: Date, timezone: string) {
  const today = formatDateForModel(now, timezone);
  const tomorrow = formatDateForModel(addDaysInTimeZone(now, 1, timezone), timezone);
  const localDate = formatDateForModel(date, timezone);
  const minutesFromNow = Math.round((date.getTime() - now.getTime()) / 60000);

  return {
    utc: date.toISOString(),
    timezone,
    localDateTime: formatDateTimeForModel(date, timezone),
    localDate,
    localTime: formatTimeForModel(date, timezone),
    weekdayLocal: getWeekdayLabel(date, timezone),
    isToday: localDate === today,
    isTomorrow: localDate === tomorrow,
    isPast: date.getTime() < now.getTime(),
    isUpcoming: date.getTime() >= now.getTime(),
    minutesFromNow,
  };
}

function shouldSkipSemanticRetrieval(query: string | null | undefined) {
  const normalized = query?.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  if (
    normalized.length <= 40 &&
    /^(\d{1,2}(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?))(\s+\1)+$/i.test(normalized)
  ) {
    return true;
  }

  if (normalized.length <= 20 && /^\d{1,2}(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?)$/i.test(normalized)) {
    return true;
  }

  if (normalized.length <= 40 && /^(it|it starts|it ends|starts|ends)\b/i.test(normalized)) {
    return true;
  }

  return false;
}

function extractSemesterContext(entries: AssistantTimetableEntryContext[]): SemesterContext | undefined {
  if (entries.length === 0) return undefined;

  const ranges = entries
    .filter((e) => e.semesterStart && e.semesterEnd)
    .map((e) => ({
      start: e.semesterStart!,
      end: e.semesterEnd!,
    }));

  if (ranges.length === 0) return undefined;

  return {
    semesterStart: ranges[0].start,
    semesterEnd: ranges[0].end,
  };
}

export async function getAssistantContextForUser(
  userId: string,
  now: Date = new Date(),
  query?: string,
  conversationId?: string,
): Promise<AssistantContext> {
  const env = getServerEnv();
  const [reminders, timetable, currentUser] = await Promise.all([
    getReminderCollections(userId),
    getTimetableCollections(userId, now),
    db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        timezone: true,
      },
    }),
  ]);

  const recentConversation = await getRecentConversationTurns(conversationId, env.PHASE6_RECENT_MESSAGE_LIMIT);

  let knowledgeHighlights: RetrievalMatch[] = [];
  let memoryHighlights: MemoryHighlight[] = [];

  if (query?.trim() && !shouldSkipSemanticRetrieval(query)) {
    try {
      knowledgeHighlights = await runSemanticRetrieval({
        userId,
        query,
        limit: 4,
        sourceTypes: ["NOTE", "FILE"],
      });
    } catch (error) {
      logWarn("assistant.context.knowledge-retrieval-failed", {
        userId,
        query,
        error,
      });
    }

    try {
      memoryHighlights = await getMemoryHighlights({
        userId,
        query,
        limit: 4,
      });
    } catch (error) {
      logWarn("assistant.context.memory-retrieval-failed", {
        userId,
        query,
        error,
      });
    }
  }

  const recentConversationTokens = estimateTokenCountForMessages(recentConversation);
  const remainingBudget = Math.max(0, env.PHASE6_CONTEXT_TOKEN_BUDGET - recentConversationTokens);
  const trimmedKnowledgeHighlights = knowledgeHighlights.filter((_, index) => index < (remainingBudget > 400 ? 4 : 2));
  const trimmedMemoryHighlights = memoryHighlights.filter((_, index) => index < (remainingBudget > 700 ? 4 : 2));

  const timetableEntries: AssistantTimetableEntryContext[] = timetable.entries.map((entry) => ({
    id: entry.id,
    subject: entry.subject,
    dayOfWeek: entry.dayOfWeek,
    startTime: entry.startTime,
    endTime: entry.endTime,
    location: entry.location,
    semesterStart: entry.semesterStart,
    semesterEnd: entry.semesterEnd,
  }));

  const semesterContext = extractSemesterContext(timetableEntries);
  const timezone = currentUser?.timezone ?? "Africa/Nairobi";
  const activeReminderFacts = reminders.scheduled.slice(0, 12).map((reminder) => ({
    id: reminder.id,
    title: reminder.title,
    priority: reminder.priority,
    type: reminder.type,
    category: reminder.category,
    timing: reminder.dueAt ? buildDerivedTimeFact(reminder.dueAt, now, timezone) : null,
  }));
  const upcomingClassFacts = timetable.upcoming.slice(0, 8).map((entry) => ({
    entryId: entry.entryId,
    subject: entry.subject,
    location: entry.location,
    timing: buildDerivedTimeFact(entry.startsAt, now, timezone),
  }));

  let recentMemoryArtifactsRecords: Array<{
    id: string;
    title: string | null;
    content: string;
    structuredData: unknown;
    entityType: string | null;
    relatedEntityId: string | null;
    createdAt: Date;
  }> = [];

  try {
    recentMemoryArtifactsRecords = await db.memoryArtifact.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        content: true,
        structuredData: true,
        entityType: true,
        relatedEntityId: true,
        createdAt: true,
      },
    });
  } catch (error) {
    logWarn("assistant.context.memory-artifacts-failed", {
      userId,
      error,
    });
  }

  const recentMemoryArtifacts = recentMemoryArtifactsRecords.map((artifact) => {
    const structured =
      typeof artifact.structuredData === "object" && artifact.structuredData
        ? (artifact.structuredData as { salientFacts?: string[]; keywords?: string[] })
        : null;

    return {
      id: artifact.id,
      title: artifact.title,
      content: artifact.content.slice(0, 200),
      salientFacts: structured?.salientFacts ?? [],
      keywords: structured?.keywords ?? [],
      entityType: artifact.entityType,
      relatedEntityId: artifact.relatedEntityId,
      createdAt: artifact.createdAt,
    };
  });

  return {
    timezone,
    now,
    activeReminders: reminders.scheduled.slice(0, 12).map((reminder) => ({
      id: reminder.id,
      title: reminder.title,
      dueAt: reminder.dueAt,
      priority: reminder.priority,
      type: reminder.type,
      category: reminder.category,
    })),
    upcomingClasses: timetable.upcoming.slice(0, 8).map((entry) => ({
      entryId: entry.entryId,
      subject: entry.subject,
      startsAt: entry.startsAt,
      location: entry.location,
    })),
    highIntegrityFacts: {
      currentTime: buildDerivedTimeFact(now, now, timezone),
      nextClass: upcomingClassFacts[0] ?? null,
      upcomingClasses: upcomingClassFacts,
      nextReminder: activeReminderFacts.find((item) => item.timing?.isUpcoming) ?? null,
      activeReminders: activeReminderFacts,
    },
    timetableEntries,
    knowledgeHighlights: trimmedKnowledgeHighlights.map((match) => ({
      sourceType: match.sourceType,
      sourceId: match.sourceId,
      sourceTitle: match.sourceTitle,
      content: match.content,
      score: match.score,
    })),
    memoryHighlights: trimmedMemoryHighlights.map((item) => ({
      artifactId: item.artifactId,
      summaryLevel: item.summaryLevel,
      title: item.title,
      content: item.content,
      score: item.score,
      sourceType: item.sourceType,
    })),
    recentMemoryArtifacts,
    recentConversation,
    semesterContext,
  };
}
