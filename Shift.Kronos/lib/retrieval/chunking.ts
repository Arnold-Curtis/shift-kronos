import { createHash } from "node:crypto";
import { RetrievalChunkInput } from "@/lib/retrieval/types";

export const DEFAULT_CHUNK_SIZE = 900;
export const DEFAULT_CHUNK_OVERLAP = 120;

function normalizeWhitespace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function sliceChunk(input: string, start: number, end: number) {
  const raw = input.slice(start, end).trim();
  return normalizeWhitespace(raw);
}

export function buildContentHash(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export function splitIntoChunks(input: string, chunkSize: number = DEFAULT_CHUNK_SIZE, overlap: number = DEFAULT_CHUNK_OVERLAP) {
  const normalized = normalizeWhitespace(input);

  if (!normalized) {
    return [] as string[];
  }

  if (normalized.length <= chunkSize) {
    return [normalized];
  }

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    const end = Math.min(normalized.length, cursor + chunkSize);
    const nextChunk = sliceChunk(normalized, cursor, end);

    if (nextChunk) {
      chunks.push(nextChunk);
    }

    if (end >= normalized.length) {
      break;
    }

    cursor = Math.max(end - overlap, cursor + 1);
  }

  return chunks;
}

export function buildChunkInputs(base: Omit<RetrievalChunkInput, "chunkIndex" | "content" | "contentHash">, content: string) {
  return splitIntoChunks(content).map((chunk, index) => ({
    ...base,
    chunkIndex: index,
    content: chunk,
    contentHash: buildContentHash(`${base.sourceType}:${base.sourceId}:${index}:${chunk}`),
  }));
}
