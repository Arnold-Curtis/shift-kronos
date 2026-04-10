import { afterEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  dispatchPendingNotifications: vi.fn(),
  isAuthorizedCronRequest: vi.fn(),
  auth: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock("@/lib/notifications/service", () => ({
  dispatchPendingNotifications: routeMocks.dispatchPendingNotifications,
}));

vi.mock("@/lib/operations/auth", () => ({
  isAuthorizedCronRequest: routeMocks.isAuthorizedCronRequest,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: routeMocks.auth,
}));

vi.mock("@/lib/observability/logger", () => ({
  logError: routeMocks.logError,
  logInfo: routeMocks.logInfo,
  logWarn: routeMocks.logWarn,
}));

import { GET, POST } from "@/app/api/cron/notifications/route";

afterEach(() => {
  routeMocks.dispatchPendingNotifications.mockReset();
  routeMocks.isAuthorizedCronRequest.mockReset();
  routeMocks.auth.mockReset();
  routeMocks.logError.mockReset();
  routeMocks.logInfo.mockReset();
  routeMocks.logWarn.mockReset();
});

describe("cron notifications route", () => {
  it("rejects unauthorized GET requests", async () => {
    routeMocks.isAuthorizedCronRequest.mockReturnValue(false);

    const response = await GET(new Request("https://shift-kronos.test/api/cron/notifications"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(routeMocks.logWarn).toHaveBeenCalledWith("cron.notifications.unauthorized", {
      path: "/api/cron/notifications",
      method: "GET",
    });
  });

  it("dispatches authorized GET requests and returns the report with duration", async () => {
    routeMocks.isAuthorizedCronRequest.mockReturnValue(true);
    routeMocks.dispatchPendingNotifications.mockResolvedValue({
      selectedCount: 1,
      skippedCount: 0,
      deliveredCount: 1,
      failedCount: 0,
      results: [],
    });

    const response = await GET(new Request("https://shift-kronos.test/api/cron/notifications"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      selectedCount: 1,
      deliveredCount: 1,
      failedCount: 0,
      skippedCount: 0,
    });
    expect(typeof payload.durationMs).toBe("number");
    expect(routeMocks.logInfo).toHaveBeenCalledWith(
      "cron.notifications.dispatched",
      expect.objectContaining({
        path: "/api/cron/notifications",
        selected: 1,
        delivered: 1,
        failed: 0,
        skipped: 0,
      }),
    );
  });

  it("allows POST dispatches for signed-in users without cron auth", async () => {
    routeMocks.isAuthorizedCronRequest.mockReturnValue(false);
    routeMocks.auth.mockResolvedValue({ userId: "user_1" });
    routeMocks.dispatchPendingNotifications.mockResolvedValue({
      selectedCount: 0,
      skippedCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      results: [],
    });

    const response = await POST(new Request("https://shift-kronos.test/api/cron/notifications", { method: "POST" }));

    expect(response.status).toBe(200);
    expect(routeMocks.dispatchPendingNotifications).toHaveBeenCalledOnce();
  });

  it("rejects POST dispatches without cron auth or a signed-in user", async () => {
    routeMocks.isAuthorizedCronRequest.mockReturnValue(false);
    routeMocks.auth.mockResolvedValue({ userId: null });

    const response = await POST(new Request("https://shift-kronos.test/api/cron/notifications", { method: "POST" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(routeMocks.logWarn).toHaveBeenCalledWith("cron.notifications.unauthorized", {
      path: "/api/cron/notifications",
      method: "POST",
      reason: "no_session_no_cron_secret",
    });
  });
});
