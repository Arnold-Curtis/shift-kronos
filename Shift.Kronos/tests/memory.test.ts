import { ConversationMessageRole, RetrievalSourceType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { estimateTokenCount, estimateTokenCountForMessages } from "@/lib/memory/tokens";
import { selectMemoryWindow } from "@/lib/memory/windows";
import { parseAssistantIntentHeuristically } from "@/lib/ai/heuristics";
import { ASSISTANT_ACTION_TYPE } from "@/lib/assistant/types";

describe("memory token helpers", () => {
  it("estimates tokens deterministically from content length", () => {
    expect(estimateTokenCount("")).toBe(0);
    expect(estimateTokenCount("hello world")).toBeGreaterThan(0);
    expect(estimateTokenCount("hello world")).toBe(estimateTokenCount("hello world"));
  });

  it("sums token estimates across messages", () => {
    const result = estimateTokenCountForMessages([
      { content: "first message" },
      { content: "second message with more words" },
    ]);

    expect(result).toBeGreaterThan(estimateTokenCount("first message"));
  });
});

describe("memory window selection", () => {
  it("selects an older unsummarized window while preserving recent turns", () => {
    const baseTime = new Date("2026-04-06T10:00:00.000Z");
    const messages = Array.from({ length: 8 }, (_, index) => ({
      id: `msg_${index + 1}`,
      role: index % 2 === 0 ? ConversationMessageRole.USER : ConversationMessageRole.ASSISTANT,
      content: `Message ${index + 1} with enough content to count toward summarization thresholds.`,
      tokenEstimate: 40,
      createdAt: new Date(baseTime.getTime() + index * 60_000),
      summarizedAt: null,
    }));

    const window = selectMemoryWindow("conv_1", messages, {
      recentMessageCount: 2,
      minMessages: 4,
      minTokens: 120,
    });

    expect(window).not.toBeNull();
    expect(window?.messages).toHaveLength(6);
    expect(window?.coveredFromMessageId).toBe("msg_1");
    expect(window?.coveredToMessageId).toBe("msg_6");
  });

  it("returns null when only recent messages remain or thresholds are too low", () => {
    const messages = Array.from({ length: 4 }, (_, index) => ({
      id: `msg_${index + 1}`,
      role: ConversationMessageRole.USER,
      content: `Short ${index}`,
      tokenEstimate: 10,
      createdAt: new Date("2026-04-06T10:00:00.000Z"),
      summarizedAt: null,
    }));

    const window = selectMemoryWindow("conv_1", messages, {
      recentMessageCount: 2,
      minMessages: 4,
      minTokens: 120,
    });

    expect(window).toBeNull();
  });
});

describe("assistant memory-aware heuristics", () => {
  it("uses memory highlights when answering knowledge-style questions", () => {
    const result = parseAssistantIntentHeuristically("What do you remember about my revision plan?", {
      timezone: "Africa/Lagos",
      now: new Date("2026-04-06T10:00:00.000Z"),
      activeReminders: [],
      upcomingClasses: [],
      knowledgeHighlights: [],
      recentConversation: [],
      memoryHighlights: [
        {
          artifactId: "mem_1",
          summaryLevel: 1,
          title: "Revision planning",
          content: "You wanted to prioritize operating systems and compiler design before Thursday.",
          score: 0.92,
          sourceType: RetrievalSourceType.MEMORY,
        },
      ],
    });

    expect(result.type).toBe(ASSISTANT_ACTION_TYPE.ANSWER_QUESTION);

    if (result.type !== ASSISTANT_ACTION_TYPE.ANSWER_QUESTION) {
      throw new Error("Expected answer action.");
    }

    expect(result.answer.summary).toContain("conversation memory");
    expect(result.answer.evidence[0]).toContain("Revision planning");
  });
});
