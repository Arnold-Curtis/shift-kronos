import { NextResponse } from "next/server";
import { decodeNotificationActionToken } from "@/lib/notifications/action-tokens";
import {
  acknowledgeTimetableNotification,
  completeReminderFromNotification,
  snoozeReminderFromNotification,
} from "@/lib/notifications/service";
import { NOTIFICATION_ACTIONS } from "@/lib/notifications/types";
import { logError, logInfo, logWarn } from "@/lib/observability/logger";

function buildHtmlResponse(title: string, message: string) {
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
    </head>
    <body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#0b1020;color:#e5eefb;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;">
      <main style="max-width:560px;width:100%;background:#11182d;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:24px;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#9fb0d2;">Shift:Kronos</p>
        <h1 style="margin:0 0 12px;font-size:24px;color:#ffffff;">${title}</h1>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#d5dded;">${message}</p>
      </main>
    </body>
  </html>`;
}

export async function GET(request: Request) {
  const { searchParams, pathname } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    logWarn("notifications.action.missing-token", { path: pathname });
    return new NextResponse(buildHtmlResponse("Action unavailable", "This notification action link is missing its token."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  try {
    const payload = decodeNotificationActionToken(token);
    const result = payload.action === NOTIFICATION_ACTIONS.COMPLETE_REMINDER
      ? await completeReminderFromNotification(payload.userId, payload.reminderId)
      : payload.action === NOTIFICATION_ACTIONS.SNOOZE_REMINDER
        ? await snoozeReminderFromNotification(payload.userId, payload.reminderId, payload.minutes)
        : await acknowledgeTimetableNotification(payload.userId, payload.timetableEntryId, payload.occurrenceKey ?? null);

    logInfo("notifications.action.completed", {
      path: pathname,
      action: payload.action,
      userId: payload.userId,
      ok: result.ok,
    });

    return new NextResponse(buildHtmlResponse(result.ok ? "Action completed" : "Action failed", result.message), {
      status: result.ok ? 200 : 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    logError("notifications.action.failed", {
      path: pathname,
      error,
    });

    const message = error instanceof Error ? error.message : "Notification action failed.";
    return new NextResponse(buildHtmlResponse("Action unavailable", message), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}
