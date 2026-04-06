import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env";

const validEnv = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/shift_kronos",
  CLERK_SECRET_KEY: "sk_test_123",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123",
  NEXT_PUBLIC_APP_URL: "https://shift-kronos.test",
  BLOB_READ_WRITE_TOKEN: "vercel_blob_token",
  TELEGRAM_BOT_TOKEN: "telegram_bot_token",
  TELEGRAM_CHAT_ID: "123456789",
  GEMINI_API_KEY: "gemini_api_key",
  GROQ_API_KEY: "groq_api_key",
  OPENROUTER_API_KEY: "openrouter_api_key",
  OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
  OPENROUTER_HTTP_REFERER: "https://shift-kronos.test",
  OPENROUTER_TITLE: "Shift:Kronos",
  PHASE4_FAKE_AI: "1",
  PHASE5_EMBEDDING_MODEL: "text-embedding-004",
  PHASE5_EMBEDDING_DIMENSIONS: "768",
  PHASE5_FAKE_EMBEDDINGS: "1",
  PHASE5_FAKE_PDF_EXTRACTION: "1",
  PHASE6_CONTEXT_TOKEN_BUDGET: "12000",
  PHASE6_RECENT_MESSAGE_LIMIT: "6",
  PHASE6_SUMMARY_MIN_MESSAGES: "6",
  PHASE6_SUMMARY_TRIGGER_TOKENS: "180",
  PHASE6_FAKE_SUMMARIES: "1",
  PHASE7_CRON_SECRET: "phase7-cron-secret",
  PHASE7_TELEGRAM_WEBHOOK_SECRET: "phase7-telegram-secret",
};

describe("parseServerEnv", () => {
  it("accepts a complete environment contract", () => {
    expect(parseServerEnv(validEnv)).toMatchObject({
      ...validEnv,
      PHASE5_EMBEDDING_DIMENSIONS: 768,
      PHASE6_CONTEXT_TOKEN_BUDGET: 12000,
      PHASE6_RECENT_MESSAGE_LIMIT: 6,
      PHASE6_SUMMARY_MIN_MESSAGES: 6,
      PHASE6_SUMMARY_TRIGGER_TOKENS: 180,
    });
  });

  it("rejects invalid configuration", () => {
    expect(() =>
      parseServerEnv({
        ...validEnv,
        NEXT_PUBLIC_APP_URL: "not-a-url",
        DATABASE_URL: "",
      }),
    ).toThrow();
  });

  it("allows Telegram chat id to be omitted for persisted user binding setups", () => {
    const result = parseServerEnv({
      ...validEnv,
      TELEGRAM_CHAT_ID: undefined,
    });

    expect(result.TELEGRAM_CHAT_ID).toBeUndefined();
  });

  it("parses the Phase 5 retrieval environment contract", () => {
    const result = parseServerEnv(validEnv);

    expect(result.PHASE5_EMBEDDING_MODEL).toBe("text-embedding-004");
    expect(result.PHASE5_EMBEDDING_DIMENSIONS).toBe(768);
    expect(result.PHASE5_FAKE_EMBEDDINGS).toBe("1");
    expect(result.PHASE5_FAKE_PDF_EXTRACTION).toBe("1");
  });

  it("parses the OpenRouter environment contract", () => {
    const result = parseServerEnv(validEnv);

    expect(result.OPENROUTER_API_KEY).toBe("openrouter_api_key");
    expect(result.OPENROUTER_BASE_URL).toBe("https://openrouter.ai/api/v1");
    expect(result.OPENROUTER_HTTP_REFERER).toBe("https://shift-kronos.test");
    expect(result.OPENROUTER_TITLE).toBe("Shift:Kronos");
  });

  it("parses the Phase 6 memory environment contract", () => {
    const result = parseServerEnv(validEnv);

    expect(result.PHASE6_CONTEXT_TOKEN_BUDGET).toBe(12000);
    expect(result.PHASE6_RECENT_MESSAGE_LIMIT).toBe(6);
    expect(result.PHASE6_SUMMARY_MIN_MESSAGES).toBe(6);
    expect(result.PHASE6_SUMMARY_TRIGGER_TOKENS).toBe(180);
    expect(result.PHASE6_FAKE_SUMMARIES).toBe("1");
  });

  it("parses the Phase 7 operational environment contract", () => {
    const result = parseServerEnv(validEnv);

    expect(result.PHASE7_CRON_SECRET).toBe("phase7-cron-secret");
    expect(result.PHASE7_TELEGRAM_WEBHOOK_SECRET).toBe("phase7-telegram-secret");
  });
});
