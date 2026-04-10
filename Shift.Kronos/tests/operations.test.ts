import { describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "@/lib/operations/auth";

process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/shift_kronos";
process.env.CLERK_SECRET_KEY = "sk_test_123";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_123";
process.env.NEXT_PUBLIC_APP_URL = "https://shift-kronos.test";
process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_token";
process.env.RESEND_API_KEY = "resend-key";
process.env.NOTIFICATION_FROM_EMAIL = "notificationstoarnold@divasglamke.com";
process.env.NOTIFICATION_TO_EMAIL = "arnoldmbici@gmail.com";
process.env.GEMINI_API_KEY = "gemini_api_key";
process.env.GROQ_API_KEY = "groq_api_key";
process.env.OPENROUTER_API_KEY = "openrouter_api_key";
process.env.OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
process.env.OPENROUTER_HTTP_REFERER = "https://shift-kronos.test";
process.env.OPENROUTER_TITLE = "Shift:Kronos";
process.env.PHASE7_CRON_SECRET = "phase7-cron-secret";
process.env.PHASE7_NOTIFICATION_ACTION_SECRET = "phase7-notification-secret";

describe("operational request authorization", () => {
  it("authorizes cron requests by shared secret", () => {
    const request = new Request("https://shift-kronos.test/api/cron/notifications", {
      headers: {
        "x-cron-secret": "phase7-cron-secret",
      },
    });

    expect(isAuthorizedCronRequest(request)).toBe(true);
  });

  it("authorizes Vercel cron requests by user agent", () => {
    const request = new Request("https://shift-kronos.test/api/cron/notifications", {
      headers: {
        "user-agent": "vercel-cron/1.0",
      },
    });

    expect(isAuthorizedCronRequest(request)).toBe(true);
  });

  it("rejects invalid cron secrets", () => {
    const request = new Request("https://shift-kronos.test/api/cron/notifications", {
      headers: {
        authorization: "Bearer wrong-secret",
      },
    });

    expect(isAuthorizedCronRequest(request)).toBe(false);
  });
});
