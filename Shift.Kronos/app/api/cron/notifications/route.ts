import { NextResponse } from "next/server";
import { dispatchPendingNotifications } from "@/lib/notifications/service";
import { isAuthorizedCronRequest } from "@/lib/operations/auth";
import { logError, logInfo, logWarn } from "@/lib/observability/logger";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    logWarn("cron.notifications.unauthorized", {
      path: new URL(request.url).pathname,
    });

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await dispatchPendingNotifications();

    logInfo("cron.notifications.dispatched", {
      path: new URL(request.url).pathname,
      selected: report.selectedCount,
      delivered: report.deliveredCount,
      failed: report.failedCount,
      skipped: report.skippedCount,
    });

    return NextResponse.json(report);
  } catch (error) {
    logError("cron.notifications.failed", {
      path: new URL(request.url).pathname,
      error,
    });

    return NextResponse.json({ error: "Notification dispatch failed" }, { status: 500 });
  }
}
