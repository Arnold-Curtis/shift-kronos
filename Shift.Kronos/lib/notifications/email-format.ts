import { formatDateTimeLabel, formatTimeLabel } from "@/lib/datetime";
import { getServerEnv } from "@/lib/env";
import {
  buildExpiringActionPayload,
  encodeNotificationActionToken,
  snoozeMinutes,
} from "@/lib/notifications/action-tokens";
import {
  DueItem,
  NOTIFICATION_ACTIONS,
  NOTIFICATION_SOURCE,
  NotificationEmailAction,
  NotificationEmailInput,
} from "@/lib/notifications/types";

function buildActionUrl(token: string) {
  const appUrl = getServerEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return `${appUrl}/api/notifications/action?token=${encodeURIComponent(token)}`;
}

function formatBodyLines(lines: string[]) {
  return lines.filter(Boolean).join("\n");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderActions(actions: NotificationEmailAction[]) {
  if (actions.length === 0) {
    return "";
  }

  return `
    <div style="margin-top:24px;display:flex;flex-wrap:wrap;gap:12px;">
      ${actions
        .map(
          (action) => `<a href="${escapeHtml(action.href)}" style="display:inline-block;padding:10px 14px;border-radius:999px;background:#1f2937;color:#ffffff;text-decoration:none;font-weight:600;">${escapeHtml(action.label)}</a>`,
        )
        .join("")}
    </div>
  `;
}

function renderHtmlShell(title: string, intro: string, detailLines: string[], actions: NotificationEmailAction[]) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#0b1020;color:#e5eefb;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#11182d;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:24px;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#9fb0d2;">Shift:Kronos notification</p>
        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#ffffff;">${escapeHtml(title)}</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#d5dded;">${escapeHtml(intro)}</p>
        <div style="margin-top:16px;padding:16px;border-radius:16px;background:#0b1020;border:1px solid rgba(255,255,255,0.06);">
          ${detailLines.map((line) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#d5dded;">${escapeHtml(line)}</p>`).join("")}
        </div>
        ${renderActions(actions)}
        <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#8ea0c4;">These action links are signed and expire automatically for safety.</p>
      </div>
    </div>
  `;
}

export function formatDueItemEmail(dueItem: DueItem): NotificationEmailInput {
  if (dueItem.sourceType === NOTIFICATION_SOURCE.REMINDER) {
    const completedToken = encodeNotificationActionToken(dueItem.actionPayloads[0]);
    const snoozeActions = snoozeMinutes.map((minutes, index) => ({
      label: index === 0 ? `Snooze ${minutes}m` : `${minutes}m`,
      href: buildActionUrl(encodeNotificationActionToken(dueItem.actionPayloads[index + 1])),
    }));
    const actions: NotificationEmailAction[] = [
      { label: "Complete", href: buildActionUrl(completedToken) },
      ...snoozeActions,
    ];
    const detailLines = [
      `Due: ${formatDateTimeLabel(dueItem.notifyAt)}`,
      ...dueItem.bodyLines.filter(Boolean),
    ];

    return {
      to: dueItem.recipientEmail,
      subject: `Reminder: ${dueItem.title}`,
      text: [
        `Reminder: ${dueItem.title}`,
        ...detailLines,
        "",
        ...actions.map((action) => `${action.label}: ${action.href}`),
      ].join("\n"),
      html: renderHtmlShell(dueItem.title, "A reminder is due and ready for action.", detailLines, actions),
    };
  }

  const acknowledgeAction = {
    label: "Acknowledge",
    href: buildActionUrl(encodeNotificationActionToken(dueItem.actionPayloads[0])),
  };
  const detailLines = [
    `Starts: ${formatDateTimeLabel(dueItem.startsAt)}`,
    `Ends: ${formatTimeLabel(dueItem.endsAt)}`,
    ...dueItem.bodyLines.filter(Boolean),
  ];

  return {
    to: dueItem.recipientEmail,
    subject: `Class alert: ${dueItem.title}`,
    text: [
      `Class alert: ${dueItem.title}`,
      ...detailLines,
      "",
      `${acknowledgeAction.label}: ${acknowledgeAction.href}`,
    ].join("\n"),
    html: renderHtmlShell(dueItem.title, "A class alert is due and can be acknowledged below.", detailLines, [acknowledgeAction]),
  };
}

export function buildReminderActionPayloads(userId: string, reminderId: string, occurrenceKey: string, now: Date = new Date()) {
  return [
    buildExpiringActionPayload({
      userId,
      action: NOTIFICATION_ACTIONS.COMPLETE_REMINDER,
      reminderId,
      occurrenceKey,
    }, now),
    ...snoozeMinutes.map((minutes) =>
      buildExpiringActionPayload({
        userId,
        action: NOTIFICATION_ACTIONS.SNOOZE_REMINDER,
        reminderId,
        occurrenceKey,
        minutes,
      }, now),
    ),
  ];
}

export function buildTimetableActionPayloads(userId: string, timetableEntryId: string, occurrenceKey: string, now: Date = new Date()) {
  return [
    buildExpiringActionPayload({
      userId,
      action: NOTIFICATION_ACTIONS.ACK_TIMETABLE,
      timetableEntryId,
      occurrenceKey,
    }, now),
  ];
}
