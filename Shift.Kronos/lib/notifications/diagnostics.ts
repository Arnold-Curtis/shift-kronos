import { db } from "@/lib/db";
import { formatDueItemEmail } from "@/lib/notifications/email-format";
import { sendNotificationEmail } from "@/lib/notifications/email";
import { buildTimetableDueItem, dispatchPendingNotifications } from "@/lib/notifications/service";
import { resolveNotificationRecipientEmail } from "@/lib/notifications/recipients";
import { getOptionalNotificationToEmail } from "@/lib/operations/env";
import { NotificationDispatchReport } from "@/lib/notifications/types";

export type EmailDiagnostics = {
  userEmailAddress: string | null;
  fallbackEmailAddress: string | null;
  resolvedEmailAddress: string | null;
  recentFailures: Array<{
    id: string;
    sourceType: string;
    failureReason: string | null;
    createdAt: Date;
  }>;
};

export async function resolveNotificationEmailAddress(clerkUserId: string | null | undefined) {
  return resolveNotificationRecipientEmail(clerkUserId);
}

export async function getEmailDiagnostics(userId: string): Promise<EmailDiagnostics> {
  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      clerkUserId: true,
    },
  });

  const recentFailures = await db.notificationEvent.findMany({
    where: {
      userId,
      transport: "email",
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

  const userEmailAddress = user?.clerkUserId ? await resolveNotificationRecipientEmail(user.clerkUserId) : null;
  const fallbackEmailAddress = getOptionalNotificationToEmail();

  return {
    userEmailAddress,
    fallbackEmailAddress,
    resolvedEmailAddress: userEmailAddress ?? fallbackEmailAddress,
    recentFailures,
  };
}

export async function sendEmailTestMessage(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { clerkUserId: true },
  });
  const resolvedEmailAddress = await resolveNotificationRecipientEmail(user?.clerkUserId);

  if (!resolvedEmailAddress) {
    return {
      ok: false,
      message: "No notification email destination is configured. Set a Clerk account email or NOTIFICATION_TO_EMAIL before sending a test email.",
      resolvedEmailAddress: null,
    };
  }

  const now = new Date();
  const simulatedOccurrence = {
    entryId: "email-test-timetable-entry",
    subject: "Operating Systems",
    location: "Hall A",
    lecturer: "Dr. Mensah",
    startsAt: new Date(now.getTime() + 30 * 60 * 1000),
    endsAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
    reminderLeadMinutes: 30,
  };

  const dueItem = buildTimetableDueItem(simulatedOccurrence, userId, resolvedEmailAddress, now);

  if (!dueItem) {
    return {
      ok: false,
      message: "Email timetable test could not be prepared.",
      resolvedEmailAddress,
    };
  }

  const result = await sendNotificationEmail(formatDueItemEmail(dueItem));

  return {
    ok: result.ok,
    message: result.ok
      ? "Email timetable test message sent successfully."
      : `Email test failed: ${result.errorMessage ?? "Unknown email error."}`,
    resolvedEmailAddress,
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
    select: { clerkUserId: true },
  });

  if (!(await resolveNotificationRecipientEmail(user?.clerkUserId))) {
    return {
      ok: false,
      message: "No notification email destination is configured. Set a Clerk account email or NOTIFICATION_TO_EMAIL before dispatching.",
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
