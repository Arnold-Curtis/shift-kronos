import { afterEach, describe, expect, it } from "vitest";
import {
  getCronSecret,
  getNotificationActionSecret,
  getNotificationFromEmail,
  getOptionalNotificationToEmail,
  getResendApiKey,
} from "@/lib/operations/env";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("email operational environment", () => {
  it("reads email operational env without requiring unrelated AI keys", () => {
    process.env.RESEND_API_KEY = "resend-key";
    process.env.NOTIFICATION_FROM_EMAIL = "notificationstoarnold@divasglamke.com";
    process.env.NOTIFICATION_TO_EMAIL = "arnoldmbici@gmail.com";
    process.env.PHASE7_CRON_SECRET = "cron-secret";
    process.env.PHASE7_NOTIFICATION_ACTION_SECRET = "notification-secret";
    delete process.env.OPENROUTER_API_KEY;

    expect(getResendApiKey()).toBe("resend-key");
    expect(getNotificationFromEmail()).toBe("notificationstoarnold@divasglamke.com");
    expect(getOptionalNotificationToEmail()).toBe("arnoldmbici@gmail.com");
    expect(getCronSecret()).toBe("cron-secret");
    expect(getNotificationActionSecret()).toBe("notification-secret");
  });

  it("allows the fallback notification email to be omitted", () => {
    delete process.env.NOTIFICATION_TO_EMAIL;

    expect(getOptionalNotificationToEmail()).toBeNull();
  });

  it("throws a clear error when the Resend key is missing", () => {
    delete process.env.RESEND_API_KEY;

    expect(() => getResendApiKey()).toThrow(/RESEND_API_KEY is required/);
  });
});
