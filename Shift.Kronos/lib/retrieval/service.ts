import { IndexingStatus, Prisma, RetrievalSourceType } from "@prisma/client";
import { db } from "@/lib/db";
import { generateEmbedding } from "@/lib/ai/providers/embeddings";
import { buildChunkInputs } from "@/lib/retrieval/chunking";
import { RetrievalChunkDraft, RetrievalMatch } from "@/lib/retrieval/types";

function asVectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}

function mapScore(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

async function replaceSourceChunks(chunks: RetrievalChunkDraft[]) {
  if (chunks.length === 0) {
    return;
  }

  const first = chunks[0];

  await db.$transaction(async (tx) => {
    await tx.retrievalChunk.deleteMany({
      where: {
        sourceType: first.sourceType,
        sourceId: first.sourceId,
      },
    });

    for (const chunk of chunks) {
      await tx.$executeRawUnsafe(
        `INSERT INTO "RetrievalChunk" ("id", "userId", "sourceType", "sourceId", "sourceTitle", "chunkIndex", "content", "contentHash", "embeddingModel", "embeddingDimension", "embedding", "createdAt", "updatedAt") VALUES (gen_random_uuid()::text, $1, $2::"RetrievalSourceType", $3, $4, $5, $6, $7, $8, $9, $10::vector, NOW(), NOW())`,
        chunk.userId,
        chunk.sourceType,
        chunk.sourceId,
        chunk.sourceTitle,
        chunk.chunkIndex,
        chunk.content,
        chunk.contentHash,
        chunk.embeddingModel,
        chunk.embeddingDimension,
        asVectorLiteral(chunk.embedding),
      );
    }
  });
}

export async function replaceIndexedContent(args: {
  userId: string;
  sourceType: RetrievalSourceType;
  sourceId: string;
  sourceTitle: string;
  content: string;
}) {
  const chunkInputs = buildChunkInputs(
    {
      userId: args.userId,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      sourceTitle: args.sourceTitle,
    },
    args.content,
  );

  const chunks: RetrievalChunkDraft[] = [];

  for (const chunk of chunkInputs) {
    const embedding = await generateEmbedding(chunk.content);
    chunks.push({
      ...chunk,
      embedding: embedding.values,
      embeddingModel: embedding.model,
      embeddingDimension: embedding.dimensions,
    });
  }

  await replaceSourceChunks(chunks);

  return chunks.length;
}

export async function clearIndexedContent(sourceType: RetrievalSourceType, sourceId: string) {
  await db.retrievalChunk.deleteMany({
    where: {
      sourceType,
      sourceId,
    },
  });
}

export async function runSemanticRetrieval(args: {
  userId: string;
  query: string;
  limit?: number;
  sourceTypes?: RetrievalSourceType[];
}) {
  const embedding = await generateEmbedding(args.query);
  const vectorLiteral = asVectorLiteral(embedding.values);
  const limit = args.limit ?? 6;

  const sourceFilter = args.sourceTypes?.length
    ? Prisma.sql`AND "sourceType" IN (${Prisma.join(args.sourceTypes)})`
    : Prisma.empty;

  const rows = await db.$queryRaw<Array<{
    id: string;
    sourceType: RetrievalSourceType;
    sourceId: string;
    sourceTitle: string;
    chunkIndex: number;
    content: string;
    score: number;
  }>>(Prisma.sql`
    SELECT
      "id",
      "sourceType",
      "sourceId",
      "sourceTitle",
      "chunkIndex",
      "content",
      1 - ("embedding" <=> ${vectorLiteral}::vector) AS score
    FROM "RetrievalChunk"
    WHERE "userId" = ${args.userId}
    ${sourceFilter}
    ORDER BY "embedding" <=> ${vectorLiteral}::vector ASC
    LIMIT ${limit}
  `);

  return rows.map<RetrievalMatch>((row) => ({
    id: row.id,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    sourceTitle: row.sourceTitle,
    chunkIndex: row.chunkIndex,
    content: row.content,
    score: mapScore(row.score),
  }));
}

export async function markNoteIndexingState(noteId: string, status: IndexingStatus, error: string | null = null) {
  await db.note.update({
    where: {
      id: noteId,
    },
    data: {
      indexingStatus: status,
      indexingError: error,
    },
  });
}

export async function markStoredFileExtractionState(fileId: string, status: IndexingStatus, error: string | null, extractedText: string | null) {
  await db.storedFile.update({
    where: {
      id: fileId,
    },
    data: {
      extractionStatus: status,
      extractionError: error,
      extractedText,
    },
  });
}

export async function markStoredFileIndexingState(fileId: string, status: IndexingStatus, error: string | null = null) {
  await db.storedFile.update({
    where: {
      id: fileId,
    },
    data: {
      indexingStatus: status,
      indexingError: error,
    },
  });
}

export async function markMemoryArtifactIndexingState(memoryArtifactId: string, status: IndexingStatus, error: string | null = null) {
  await db.memoryArtifact.update({
    where: {
      id: memoryArtifactId,
    },
    data: {
      indexingStatus: status,
      indexingError: error,
    },
  });
}
