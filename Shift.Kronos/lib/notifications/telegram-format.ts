import { formatDateTimeLabel, formatTimeLabel } from "@/lib/datetime";
import { encodeTelegramCallbackPayload, snoozeMinutes } from "@/lib/notifications/telegram-callbacks";
import { DueItem, NOTIFICATION_SOURCE, TelegramSendMessageInput } from "@/lib/notifications/types";

function formatBodyLines(lines: string[]) {
  return lines.filter(Boolean).join("\n");
}

export function formatDueItemMessage(dueItem: DueItem): TelegramSendMessageInput {
  if (dueItem.sourceType === NOTIFICATION_SOURCE.REMINDER) {
    const text = [
      `Reminder: ${dueItem.title}`,
      `Due: ${formatDateTimeLabel(dueItem.notifyAt)}`,
      formatBodyLines(dueItem.bodyLines),
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      chatId: dueItem.chatId,
      text,
      inlineKeyboard: [
        [
          {
            text: "Done",
            callbackData: encodeTelegramCallbackPayload(dueItem.actionPayloads[0]),
          },
        ],
        snoozeMinutes.map((minutes, index) => ({
          text: index === 0 ? `Snooze ${minutes}m` : `${minutes}m`,
          callbackData: encodeTelegramCallbackPayload(dueItem.actionPayloads[index + 1]),
        })),
      ],
    };
  }

  if (dueItem.sourceType !== NOTIFICATION_SOURCE.TIMETABLE) {
    throw new Error("Unsupported due item source type.");
  }

  const text = [
    `Class alert: ${dueItem.title}`,
    `Starts: ${formatDateTimeLabel(dueItem.startsAt)}`,
    `Ends: ${formatTimeLabel(dueItem.endsAt)}`,
    formatBodyLines(dueItem.bodyLines),
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    chatId: dueItem.chatId,
    text,
    inlineKeyboard: [
      [
        {
          text: "Acknowledge",
          callbackData: encodeTelegramCallbackPayload(dueItem.actionPayloads[0]),
        },
      ],
    ],
  };
}
