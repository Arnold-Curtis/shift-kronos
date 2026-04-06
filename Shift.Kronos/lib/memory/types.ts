import { ConversationMessageRole, MemoryArtifactStatus, RetrievalSourceType } from "@prisma/client";

export type MemoryMessage = {
  id: string;
  role: ConversationMessageRole;
  content: string;
  tokenEstimate: number;
  createdAt: Date;
  summarizedAt: Date | null;
};

export type MemorySummaryDraft = {
  title: string;
  summary: string;
  salientFacts: string[];
  openLoops: string[];
  keywords: string[];
};

export type MemoryWindow = {
  conversationId: string;
  summaryLevel: number;
  messages: MemoryMessage[];
  tokenEstimate: number;
  coveredFromMessageId: string;
  coveredToMessageId: string;
  sourceStartedAt: Date;
  sourceEndedAt: Date;
};

export type MemoryHighlight = {
  artifactId: string;
  summaryLevel: number;
  title: string | null;
  content: string;
  score: number;
  sourceType: RetrievalSourceType;
};

export type RecentConversationTurn = {
  id: string;
  role: ConversationMessageRole;
  content: string;
  createdAt: Date;
  tokenEstimate: number;
};

export type MemoryArtifactIndexView = {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  summaryLevel: number;
  status: MemoryArtifactStatus;
  indexingStatus: "PENDING" | "INDEXED" | "FAILED" | "UNSUPPORTED";
  indexingError: string | null;
};
