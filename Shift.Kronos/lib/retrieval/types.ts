import { IndexingStatus, RetrievalSourceType } from "@prisma/client";

export type RetrievalChunkInput = {
  userId: string;
  sourceType: RetrievalSourceType;
  sourceId: string;
  sourceTitle: string;
  chunkIndex: number;
  content: string;
  contentHash: string;
};

export type RetrievalChunkDraft = RetrievalChunkInput & {
  embedding: number[];
  embeddingModel: string;
  embeddingDimension: number;
};

export type RetrievalMatch = {
  id: string;
  sourceType: RetrievalSourceType;
  sourceId: string;
  sourceTitle: string;
  chunkIndex: number;
  content: string;
  score: number;
};

export type SourceIndexState = {
  indexingStatus: IndexingStatus;
  indexingError: string | null;
};

export type FileExtractionState = {
  extractionStatus: IndexingStatus;
  extractionError: string | null;
  extractedText: string | null;
};
