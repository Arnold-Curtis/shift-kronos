import { NextResponse } from "next/server";
import { dispatchPendingNotifications } from "@/lib/notifications/service";
import { isAuthorizedCronRequest } from "@/lib/operations/auth";
import { logError, logInfo, logWarn } from "@/lib/observability/logger";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    logWarn("cron.notifications.unauthorized", {
      path: new URL(request.url).pathname,
      method: "GET",
    });

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return handleDispatch(request);
}

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    const { auth } = await import("@clerk/nextjs/server");
    const session = await auth();

    if (!session.userId) {
      logWarn("cron.notifications.unauthorized", {
        path: new URL(request.url).pathname,
        method: "POST",
        reason: "no_session_no_cron_secret",
      });

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return handleDispatch(request);
}

async function handleDispatch(request: Request) {
  const dispatchStart = Date.now();

  try {
    const report = await dispatchPendingNotifications();

    const durationMs = Date.now() - dispatchStart;

    logInfo("cron.notifications.dispatched", {
      path: new URL(request.url).pathname,
      selected: report.selectedCount,
      delivered: report.deliveredCount,
      failed: report.failedCount,
      skipped: report.skippedCount,
      durationMs,
    });

    return NextResponse.json({
      ...report,
      durationMs,
    });
  } catch (error) {
    const durationMs = Date.now() - dispatchStart;

    logError("cron.notifications.failed", {
      path: new URL(request.url).pathname,
      durationMs,
      error,
    });

    return NextResponse.json({ error: "Notification dispatch failed" }, { status: 500 });
  }
}
