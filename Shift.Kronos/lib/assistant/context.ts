import { db } from "@/lib/db";
import { getReminderCollections } from "@/lib/reminders/service";
import { getTimetableCollections } from "@/lib/timetable/service";
import { AssistantContext } from "@/lib/assistant/types";
import { runSemanticRetrieval } from "@/lib/retrieval/service";
import { getServerEnv } from "@/lib/env";
import { getMemoryHighlights, getRecentConversationTurns } from "@/lib/memory/service";
import { estimateTokenCountForMessages } from "@/lib/memory/tokens";
import { logWarn } from "@/lib/observability/logger";
import { MemoryHighlight } from "@/lib/memory/types";
import { RetrievalMatch } from "@/lib/retrieval/types";

function shouldSkipSemanticRetrieval(query: string | null | undefined) {
  const normalized = query?.trim().toLowerCase();

  if (!normalized) {
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

  return {
    timezone: currentUser?.timezone ?? "Africa/Lagos",
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
    recentConversation,
  };
}
