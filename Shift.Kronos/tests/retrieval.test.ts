import { describe, expect, it, vi } from "vitest";
import { buildChunkInputs, splitIntoChunks } from "@/lib/retrieval/chunking";
import { generateEmbedding } from "@/lib/ai/providers/embeddings";
import { normalizeAssistantModelForProvider } from "@/lib/ai/preferences";

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
    process.env.OPENROUTER_API_KEY = "openrouter_api_key";
    process.env.OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
    process.env.OPENROUTER_HTTP_REFERER = "https://shift-kronos.test";
    process.env.OPENROUTER_TITLE = "Shift:Kronos";
    process.env.PHASE7_CRON_SECRET = "phase7-cron-secret";
    process.env.PHASE7_TELEGRAM_WEBHOOK_SECRET = "phase7-telegram-secret";

    const result = await generateEmbedding("retrieval test input");

    expect(result.model).toBe("test-embedding-model");
    expect(result.dimensions).toBe(12);
    expect(result.values).toHaveLength(12);
  });

  it("normalizes deprecated Gemini embedding model names", async () => {
    process.env.PHASE5_FAKE_EMBEDDINGS = "0";
    process.env.PHASE5_EMBEDDING_MODEL = "text-embedding-004";
    process.env.PHASE5_EMBEDDING_DIMENSIONS = "768";
    process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/shift_kronos";
    process.env.CLERK_SECRET_KEY = "sk_test_123";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_123";
    process.env.NEXT_PUBLIC_APP_URL = "https://shift-kronos.test";
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_token";
    process.env.TELEGRAM_BOT_TOKEN = "telegram_bot_token";
    process.env.GEMINI_API_KEY = "gemini_api_key";
    process.env.GROQ_API_KEY = "groq_api_key";
    process.env.OPENROUTER_API_KEY = "openrouter_api_key";
    process.env.OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
    process.env.OPENROUTER_HTTP_REFERER = "https://shift-kronos.test";
    process.env.OPENROUTER_TITLE = "Shift:Kronos";
    process.env.PHASE7_CRON_SECRET = "phase7-cron-secret";
    process.env.PHASE7_TELEGRAM_WEBHOOK_SECRET = "phase7-telegram-secret";

    const originalFetch = global.fetch;
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          embedding: {
            values: [0.1, 0.2, 0.3],
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ) as Response,
    );

    try {
      vi.resetModules();
      const { generateEmbedding: freshGenerateEmbedding } = await import("@/lib/ai/providers/embeddings");
      const result = await freshGenerateEmbedding("retrieval test input");

      expect(result.model).toBe("gemini-embedding-001");
      expect(vi.mocked(global.fetch)).toHaveBeenCalledOnce();
      const [url, init] = vi.mocked(global.fetch).mock.calls[0];
      expect(String(url)).toContain("models/gemini-embedding-001:embedContent");
      expect(String((init as RequestInit).body)).toContain('"model":"models/gemini-embedding-001"');
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe("assistant model normalization", () => {
  it("falls back to the OpenRouter default when a legacy Groq model is still saved", () => {
    expect(normalizeAssistantModelForProvider("openrouter", "llama-3.3-70b-versatile")).toBe("qwen/qwen3-next-80b-a3b-instruct");
  });

  it("keeps valid OpenRouter model ids intact", () => {
    expect(normalizeAssistantModelForProvider("openrouter", "qwen/qwen3-next-80b-a3b-instruct")).toBe("qwen/qwen3-next-80b-a3b-instruct");
  });
});
