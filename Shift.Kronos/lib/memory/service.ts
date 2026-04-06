import { IndexingStatus, MemoryArtifactStatus, RetrievalSourceType } from "@prisma/client";
import { db } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { generateStructuredMemorySummary } from "@/lib/ai/providers/text";
import { estimateTokenCount } from "@/lib/memory/tokens";
import { MemoryArtifactIndexView, MemoryHighlight, MemoryMessage, RecentConversationTurn } from "@/lib/memory/types";
import { selectMemoryWindow } from "@/lib/memory/windows";
import { clearIndexedContent, markMemoryArtifactIndexingState, replaceIndexedContent, runSemanticRetrieval } from "@/lib/retrieval/service";

function composeMemoryIndexContent(artifact: { title: string | null; content: string; structuredData: unknown }) {
  const data = typeof artifact.structuredData === "object" && artifact.structuredData ? artifact.structuredData as {
    salientFacts?: string[];
    openLoops?: string[];
    keywords?: string[];
  } : null;

  const parts = [
    artifact.title?.trim() ?? "",
    artifact.content.trim(),
    data?.salientFacts?.length ? `Facts: ${data.salientFacts.join("; ")}` : "",
    data?.openLoops?.length ? `Open loops: ${data.openLoops.join("; ")}` : "",
    data?.keywords?.length ? `Keywords: ${data.keywords.join(", ")}` : "",
  ];

  return parts.filter(Boolean).join("\n\n");
}

async function indexMemoryArtifact(artifact: MemoryArtifactIndexView & { structuredData: unknown }) {
  await markMemoryArtifactIndexingState(artifact.id, IndexingStatus.PENDING, null);

  try {
    await replaceIndexedContent({
      userId: artifact.userId,
      sourceType: RetrievalSourceType.MEMORY,
      sourceId: artifact.id,
      sourceTitle: artifact.title ?? `Memory summary L${artifact.summaryLevel}`,
      content: composeMemoryIndexContent(artifact),
    });
    await markMemoryArtifactIndexingState(artifact.id, IndexingStatus.INDEXED, null);
  } catch (error) {
    await clearIndexedContent(RetrievalSourceType.MEMORY, artifact.id);
    await markMemoryArtifactIndexingState(
      artifact.id,
      IndexingStatus.FAILED,
      error instanceof Error ? error.message : "Memory indexing failed.",
    );
    throw error;
  }
}

export async function getRecentConversationTurns(conversationId?: string, limit?: number): Promise<RecentConversationTurn[]> {
  if (!conversationId) {
    return [];
  }

  const messageLimit = limit ?? getServerEnv().PHASE6_RECENT_MESSAGE_LIMIT;
  const messages = await db.conversationMessage.findMany({
    where: {
      conversationId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: messageLimit,
  });

  return messages
    .slice()
    .reverse()
    .map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
      tokenEstimate: message.tokenEstimate,
    }));
}

export async function getMemoryHighlights(args: { userId: string; query: string; limit?: number }): Promise<MemoryHighlight[]> {
  const matches = await runSemanticRetrieval({
    userId: args.userId,
    query: args.query,
    limit: args.limit ?? 4,
    sourceTypes: [RetrievalSourceType.MEMORY],
  });

  if (matches.length === 0) {
    return [];
  }

  const artifacts = await db.memoryArtifact.findMany({
    where: {
      id: {
        in: matches.map((match) => match.sourceId),
      },
    },
    select: {
      id: true,
      title: true,
      content: true,
      summaryLevel: true,
    },
  });

  const artifactById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));

  return matches.flatMap((match) => {
    const artifact = artifactById.get(match.sourceId);

    if (!artifact) {
      return [];
    }

    return [{
      artifactId: artifact.id,
      summaryLevel: artifact.summaryLevel,
      title: artifact.title,
      content: artifact.content,
      score: match.score,
      sourceType: RetrievalSourceType.MEMORY,
    }];
  });
}

export async function processConversationMemory(userId: string, conversationId: string) {
  const env = getServerEnv();
  const messages = await db.conversationMessage.findMany({
    where: {
      conversationId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const typedMessages: MemoryMessage[] = messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    tokenEstimate: message.tokenEstimate,
    createdAt: message.createdAt,
    summarizedAt: message.summarizedAt,
  }));

  const window = selectMemoryWindow(conversationId, typedMessages, {
    recentMessageCount: env.PHASE6_RECENT_MESSAGE_LIMIT,
    minMessages: env.PHASE6_SUMMARY_MIN_MESSAGES,
    minTokens: env.PHASE6_SUMMARY_TRIGGER_TOKENS,
  });

  if (!window) {
    return null;
  }

  const existing = await db.memoryArtifact.findFirst({
    where: {
      userId,
      conversationId,
      coveredFromMessageId: window.coveredFromMessageId,
      coveredToMessageId: window.coveredToMessageId,
      summaryLevel: 1,
    },
  });

  if (existing) {
    return existing;
  }

  const summary = await generateStructuredMemorySummary({
    conversationId,
    messages: window.messages.map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
  });

  const content = [summary.summary, summary.salientFacts.length ? `Key facts: ${summary.salientFacts.join("; ")}` : "", summary.openLoops.length ? `Open loops: ${summary.openLoops.join("; ")}` : ""]
    .filter(Boolean)
    .join("\n\n");

  const artifact = await db.memoryArtifact.create({
    data: {
      userId,
      conversationId,
      kind: "conversation_summary",
      status: MemoryArtifactStatus.READY,
      summaryLevel: 1,
      sourceReference: conversationId,
      title: summary.title,
      content,
      structuredData: {
        summary: summary.summary,
        salientFacts: summary.salientFacts,
        openLoops: summary.openLoops,
        keywords: summary.keywords,
      },
      tokenEstimate: estimateTokenCount(content),
      coveredFromMessageId: window.coveredFromMessageId,
      coveredToMessageId: window.coveredToMessageId,
      coveredMessageCount: window.messages.length,
      sourceStartedAt: window.sourceStartedAt,
      sourceEndedAt: window.sourceEndedAt,
    },
  });

  await db.conversationMessage.updateMany({
    where: {
      id: {
        in: window.messages.map((message) => message.id),
      },
    },
    data: {
      summarizedAt: new Date(),
    },
  });

  await db.conversation.update({
    where: {
      id: conversationId,
    },
    data: {
      latestSummarizedMessageAt: window.sourceEndedAt,
    },
  });

  await indexMemoryArtifact({
    id: artifact.id,
    userId: artifact.userId,
    title: artifact.title,
    content: artifact.content,
    summaryLevel: artifact.summaryLevel,
    status: artifact.status,
    indexingStatus: artifact.indexingStatus,
    indexingError: artifact.indexingError,
    structuredData: artifact.structuredData,
  });

  return artifact;
}

export async function backfillUserMemory(userId: string) {
  const conversations = await db.conversation.findMany({
    where: {
      userId,
    },
    orderBy: {
      updatedAt: "asc",
    },
    select: {
      id: true,
    },
  });

  const results = [] as string[];

  for (const conversation of conversations) {
    const artifact = await processConversationMemory(userId, conversation.id);

    if (artifact) {
      results.push(artifact.id);
    }
  }

  return results;
}
