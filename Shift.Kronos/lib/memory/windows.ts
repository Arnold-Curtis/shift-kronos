import { MemoryMessage, MemoryWindow } from "@/lib/memory/types";

export type MemoryWindowOptions = {
  recentMessageCount: number;
  minMessages: number;
  minTokens: number;
};

export function selectMemoryWindow(conversationId: string, messages: MemoryMessage[], options: MemoryWindowOptions): MemoryWindow | null {
  const unsummarized = messages.filter((message) => !message.summarizedAt);

  if (unsummarized.length <= options.recentMessageCount) {
    return null;
  }

  const eligible = unsummarized.slice(0, Math.max(0, unsummarized.length - options.recentMessageCount));

  if (eligible.length < options.minMessages) {
    return null;
  }

  const tokenEstimate = eligible.reduce((total, message) => total + message.tokenEstimate, 0);

  if (tokenEstimate < options.minTokens) {
    return null;
  }

  const first = eligible[0];
  const last = eligible[eligible.length - 1];

  if (!first || !last) {
    return null;
  }

  return {
    conversationId,
    summaryLevel: 1,
    messages: eligible,
    tokenEstimate,
    coveredFromMessageId: first.id,
    coveredToMessageId: last.id,
    sourceStartedAt: first.createdAt,
    sourceEndedAt: last.createdAt,
  };
}
