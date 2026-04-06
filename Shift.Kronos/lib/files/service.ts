import { IndexingStatus, RetrievalSourceType } from "@prisma/client";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/blob";
import { extractFileText } from "@/lib/files/extraction";
import { storedFileDeleteSchema } from "@/lib/files/schemas";
import {
  clearIndexedContent,
  markStoredFileExtractionState,
  markStoredFileIndexingState,
  replaceIndexedContent,
} from "@/lib/retrieval/service";

function buildSafeBlobPath(userId: string, filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `uploads/${userId}/${Date.now()}-${safeName}`;
}

async function indexStoredFile(record: { id: string; userId: string; originalFilename: string; extractedText: string | null }) {
  if (!record.extractedText) {
    await clearIndexedContent(RetrievalSourceType.FILE, record.id);
    await markStoredFileIndexingState(record.id, IndexingStatus.UNSUPPORTED, "No extracted text is available for indexing.");
    return;
  }

  await markStoredFileIndexingState(record.id, IndexingStatus.PENDING, null);

  try {
    await replaceIndexedContent({
      userId: record.userId,
      sourceType: RetrievalSourceType.FILE,
      sourceId: record.id,
      sourceTitle: record.originalFilename,
      content: `Filename: ${record.originalFilename}\n\n${record.extractedText}`,
    });
    await markStoredFileIndexingState(record.id, IndexingStatus.INDEXED, null);
  } catch (error) {
    await clearIndexedContent(RetrievalSourceType.FILE, record.id);
    await markStoredFileIndexingState(record.id, IndexingStatus.FAILED, error instanceof Error ? error.message : "File indexing failed.");
    throw error;
  }
}

export async function createStoredFile(userId: string, file: File) {
  if (!file.name.trim()) {
    throw new Error("A file name is required.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const pathname = buildSafeBlobPath(userId, file.name);
  const uploaded = await uploadFile({
    pathname,
    body: buffer,
    contentType: file.type || undefined,
  });

  const record = await db.storedFile.create({
    data: {
      userId,
      blobUrl: uploaded.url,
      blobPath: uploaded.pathname,
      originalFilename: file.name,
      contentType: file.type || "application/octet-stream",
      byteSize: file.size,
    },
  });

  try {
    const extracted = await extractFileText({
      contentType: record.contentType,
      buffer,
    });

    if (extracted.kind === "unsupported") {
      await markStoredFileExtractionState(record.id, IndexingStatus.UNSUPPORTED, "This file type is not yet supported for text extraction.", null);
      await markStoredFileIndexingState(record.id, IndexingStatus.UNSUPPORTED, "This file type is not yet supported for semantic retrieval.");
      return record;
    }

    await markStoredFileExtractionState(record.id, IndexingStatus.INDEXED, null, extracted.text);

    await indexStoredFile({
      ...record,
      extractedText: extracted.text,
    });

    return record;
  } catch (error) {
    const message = error instanceof Error ? error.message : "File extraction failed.";
    await markStoredFileExtractionState(record.id, IndexingStatus.FAILED, message, null);
    await markStoredFileIndexingState(record.id, IndexingStatus.FAILED, message);
    throw error;
  }
}

export async function listStoredFiles(userId: string) {
  return db.storedFile.findMany({
    where: {
      userId,
    },
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
  });
}

export async function deleteStoredFile(userId: string, id: string) {
  const values = storedFileDeleteSchema.parse({ id });
  const existing = await db.storedFile.findFirst({
    where: {
      id: values.id,
      userId,
    },
  });

  if (!existing) {
    throw new Error("File not found.");
  }

  await clearIndexedContent(RetrievalSourceType.FILE, existing.id);
  await del(existing.blobUrl);

  return db.storedFile.delete({
    where: {
      id: existing.id,
    },
  });
}
