import { afterEach, describe, expect, it } from "vitest";
import {
  getCronSecret,
  getOptionalTelegramChatId,
  getTelegramBotToken,
  getTelegramWebhookSecret,
} from "@/lib/operations/env";
import { resolveTelegramChatId } from "@/lib/notifications/diagnostics";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("telegram operational environment", () => {
  it("reads Telegram operational env without requiring unrelated AI keys", () => {
    process.env.TELEGRAM_BOT_TOKEN = "telegram_bot_token";
    process.env.TELEGRAM_CHAT_ID = "6060259496";
    process.env.PHASE7_CRON_SECRET = "cron-secret";
    process.env.PHASE7_TELEGRAM_WEBHOOK_SECRET = "webhook-secret";
    delete process.env.OPENROUTER_API_KEY;

    expect(getTelegramBotToken()).toBe("telegram_bot_token");
    expect(getOptionalTelegramChatId()).toBe("6060259496");
    expect(getCronSecret()).toBe("cron-secret");
    expect(getTelegramWebhookSecret()).toBe("webhook-secret");
  });

  it("resolves user chat ids ahead of the fallback chat id", () => {
    process.env.TELEGRAM_CHAT_ID = "fallback-chat";

    expect(resolveTelegramChatId("user-chat")).toBe("user-chat");
    expect(resolveTelegramChatId(null)).toBe("fallback-chat");
  });

  it("throws a clear error when the bot token is missing", () => {
    delete process.env.TELEGRAM_BOT_TOKEN;

    expect(() => getTelegramBotToken()).toThrow(/TELEGRAM_BOT_TOKEN is required/);
  });
});
