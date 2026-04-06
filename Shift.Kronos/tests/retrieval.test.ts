import { describe, expect, it } from "vitest";
import { buildChunkInputs, splitIntoChunks } from "@/lib/retrieval/chunking";
import { generateEmbedding } from "@/lib/ai/providers/embeddings";

describe("retrieval chunking", () => {
  it("splits long content into deterministic chunks", () => {
    const chunks = splitIntoChunks("alpha ".repeat(400), 120, 20);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.length).toBeLessThanOrEqual(120);
  });

  it("builds chunk metadata with stable indexes and hashes", () => {
    const chunks = buildChunkInputs(
      {
        userId: "user_1",
        sourceType: "NOTE",
        sourceId: "note_1",
        sourceTitle: "Study plan",
      },
      "Plan the week around deadlines and revision blocks.",
    );

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.chunkIndex).toBe(0);
    expect(chunks[0]?.contentHash).toHaveLength(64);
  });
});

describe("embedding provider", () => {
  it("returns deterministic fake embeddings when configured", async () => {
    process.env.PHASE5_FAKE_EMBEDDINGS = "1";
    process.env.PHASE5_EMBEDDING_DIMENSIONS = "12";
    process.env.PHASE5_EMBEDDING_MODEL = "test-embedding-model";
    process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/shift_kronos";
    process.env.CLERK_SECRET_KEY = "sk_test_123";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_123";
    process.env.NEXT_PUBLIC_APP_URL = "https://shift-kronos.test";
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_token";
    process.env.TELEGRAM_BOT_TOKEN = "telegram_bot_token";
    process.env.GEMINI_API_KEY = "gemini_api_key";
    process.env.GROQ_API_KEY = "groq_api_key";
    process.env.PHASE7_CRON_SECRET = "phase7-cron-secret";
    process.env.PHASE7_TELEGRAM_WEBHOOK_SECRET = "phase7-telegram-secret";

    const result = await generateEmbedding("retrieval test input");

    expect(result.model).toBe("test-embedding-model");
    expect(result.dimensions).toBe(12);
    expect(result.values).toHaveLength(12);
  });
});
