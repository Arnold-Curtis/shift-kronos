import { db } from "@/lib/db";
import { buildTimetableDueItem } from "@/lib/notifications/service";
import { formatDueItemMessage } from "@/lib/notifications/telegram-format";
import { getOptionalTelegramChatId } from "@/lib/operations/env";
import { sendTelegramMessage } from "@/lib/notifications/telegram";
import { dispatchPendingNotifications } from "@/lib/notifications/service";
import { NotificationDispatchReport } from "@/lib/notifications/types";

export type TelegramDiagnostics = {
  userTelegramChatId: string | null;
  fallbackTelegramChatId: string | null;
  resolvedTelegramChatId: string | null;
  recentFailures: Array<{
    id: string;
    sourceType: string;
    failureReason: string | null;
    createdAt: Date;
  }>;
};

export function resolveTelegramChatId(userTelegramChatId: string | null | undefined) {
  return userTelegramChatId ?? getOptionalTelegramChatId();
}

export async function getTelegramDiagnostics(userId: string): Promise<TelegramDiagnostics> {
  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      telegramChatId: true,
    },
  });

  const recentFailures = await db.notificationEvent.findMany({
    where: {
      userId,
      transport: "telegram",
      failureReason: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
    select: {
      id: true,
      sourceType: true,
      failureReason: true,
      createdAt: true,
    },
  });

  const fallbackTelegramChatId = getOptionalTelegramChatId();
  const userTelegramChatId = user?.telegramChatId ?? null;

  return {
    userTelegramChatId,
    fallbackTelegramChatId,
    resolvedTelegramChatId: resolveTelegramChatId(userTelegramChatId),
    recentFailures,
  };
}

export async function sendTelegramTestMessage(userId: string) {
  const diagnostics = await getTelegramDiagnostics(userId);

  if (!diagnostics.resolvedTelegramChatId) {
    return {
      ok: false,
      message:
        "No Telegram destination is configured. Link your chat or set TELEGRAM_CHAT_ID before sending a test message.",
      resolvedChatId: null,
    };
  }

  const now = new Date();
  const simulatedOccurrence = {
    entryId: "telegram-test-timetable-entry",
    subject: "Operating Systems",
    location: "Hall A",
    lecturer: "Dr. Mensah",
    startsAt: new Date(now.getTime() + 30 * 60 * 1000),
    endsAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
    reminderLeadMinutes: 30,
  };

  const dueItem = buildTimetableDueItem(
    simulatedOccurrence,
    userId,
    diagnostics.resolvedTelegramChatId,
    now,
  );

  if (!dueItem) {
    return {
      ok: false,
      message: "Telegram timetable test could not be prepared.",
      resolvedChatId: diagnostics.resolvedTelegramChatId,
    };
  }

  const result = await sendTelegramMessage(formatDueItemMessage(dueItem));

  return {
    ok: result.ok,
    message: result.ok
      ? "Telegram timetable test message sent successfully."
      : `Telegram test failed: ${result.errorMessage ?? "Unknown Telegram error."}`,
    resolvedChatId: diagnostics.resolvedTelegramChatId,
  };
}

export type DispatchDiagnosticsResult = {
  ok: boolean;
  message: string;
  report: NotificationDispatchReport | null;
};

export async function dispatchNotificationDiagnostics(userId: string): Promise<DispatchDiagnosticsResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { telegramChatId: true },
  });

  if (!user?.telegramChatId && !getOptionalTelegramChatId()) {
    return {
      ok: false,
      message: "No Telegram destination is configured. Link your chat or set TELEGRAM_CHAT_ID before dispatching.",
      report: null,
    };
  }

  try {
    const report = await dispatchPendingNotifications();

    return {
      ok: true,
      message: report.deliveredCount > 0
        ? `Dispatched ${report.deliveredCount} notification(s), ${report.failedCount} failed, ${report.skippedCount} already sent.`
        : report.selectedCount === 0
          ? "No pending notifications to dispatch right now."
          : `No notifications delivered. ${report.failedCount} failed, ${report.skippedCount} already sent.`,
      report,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Notification dispatch failed.",
      report: null,
    };
  }
}
