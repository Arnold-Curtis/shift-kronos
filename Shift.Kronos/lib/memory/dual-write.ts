import { db } from "@/lib/db";
import { EntityType } from "@/lib/assistant/types";
import { IndexingStatus, MemoryArtifactStatus, RetrievalSourceType } from "@prisma/client";
import { replaceIndexedContent, markMemoryArtifactIndexingState, clearIndexedContent } from "@/lib/retrieval/service";

interface DualWriteParams {
  userId: string;
  entityType: EntityType;
  entityId: string;
  entityTitle: string;
  entityContent: string;
  conversationId?: string;
}

function extractSalientFacts(content: string, title: string): string[] {
  const facts: string[] = [];

  facts.push(title);

  const timeMatch = content.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)\b/i);
  if (timeMatch) {
    facts.push(`Time reference: ${timeMatch[1]}`);
  }

  return facts;
}

function extractKeywords(title: string, content: string): string[] {
  const text = `${title} ${content}`.toLowerCase();
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "and", "but", "if", "or", "because", "until", "while", "i", "me", "my", "myself", "we", "our", "you", "your", "he", "him", "his", "she", "her", "it", "its", "they", "them", "their", "what", "which", "who", "whom", "this", "that", "these", "those", "am"]);

  const words = text.match(/\b[a-z]{3,}\b/g) || [];
  const filtered = words.filter((w) => !stopWords.has(w));

  return [...new Set(filtered)].slice(0, 10);
}

async function indexMemoryArtifact(artifact: {
  id: string;
  userId: string;
  content: string;
  title: string | null;
}) {
  await markMemoryArtifactIndexingState(artifact.id, IndexingStatus.PENDING, null);

  try {
    await replaceIndexedContent({
      userId: artifact.userId,
      sourceType: RetrievalSourceType.MEMORY,
      sourceId: artifact.id,
      sourceTitle: artifact.title ?? `Entity memory`,
      content: `${artifact.title || ""} ${artifact.content}`,
    });
    await markMemoryArtifactIndexingState(artifact.id, IndexingStatus.INDEXED, null);
  } catch (error) {
    await clearIndexedContent(RetrievalSourceType.MEMORY, artifact.id);
    await markMemoryArtifactIndexingState(
      artifact.id,
      IndexingStatus.FAILED,
      error instanceof Error ? error.message : "Memory indexing failed.",
    );
  }
}

export async function createMemoryForEntity({
  userId,
  entityType,
  entityId,
  entityTitle,
  entityContent,
  conversationId,
}: DualWriteParams) {
  const memoryArtifact = await db.memoryArtifact.create({
    data: {
      userId,
      kind: "entity_snapshot",
      status: MemoryArtifactStatus.READY,
      summaryLevel: 0,
      title: `${entityType}: ${entityTitle}`,
      content: entityContent,
      structuredData: {
        salientFacts: extractSalientFacts(entityContent, entityTitle),
        openLoops: [],
        keywords: extractKeywords(entityTitle, entityContent),
        entityId,
        entityType,
      },
      relatedEntityId: entityId,
      entityType,
      conversationId,
    },
  });

  await indexMemoryArtifact({
    id: memoryArtifact.id,
    userId: memoryArtifact.userId,
    title: memoryArtifact.title,
    content: memoryArtifact.content,
  });

  return memoryArtifact;
}

export async function updateMemoryForEntity(
  entityId: string,
  entityType: string,
  updates: { title?: string; content?: string },
) {
  const artifacts = await db.memoryArtifact.findMany({
    where: {
      kind: "entity_snapshot",
      relatedEntityId: entityId,
      entityType,
    },
  });

  if (artifacts.length === 0) {
    return;
  }

  for (const artifact of artifacts) {
    const newTitle = updates.title ? `${entityType}: ${updates.title}` : artifact.title;
    const newContent = updates.content ?? artifact.content;

    await db.memoryArtifact.update({
      where: { id: artifact.id },
      data: {
        title: newTitle,
        content: newContent,
        structuredData: {
          salientFacts: extractSalientFacts(newContent, updates.title ?? artifact.title ?? ""),
          openLoops: [],
          keywords: extractKeywords(updates.title ?? artifact.title ?? "", newContent),
          entityId,
          entityType,
        },
      },
    });

    await indexMemoryArtifact({
      id: artifact.id,
      userId: artifact.userId,
      title: newTitle,
      content: newContent,
    });
  }
}
