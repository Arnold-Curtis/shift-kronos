import { db } from "@/lib/db";
import { decodeTelegramCallbackPayload } from "@/lib/notifications/telegram-callbacks";
import {
  acknowledgeTimetableNotification,
  completeReminderFromNotification,
  snoozeReminderFromNotification,
} from "@/lib/notifications/service";
import { TELEGRAM_ACTIONS, TelegramCallbackActionResult } from "@/lib/notifications/types";

export async function handleTelegramCallbackAction(telegramChatId: string | null | undefined, callbackData: string) {
  if (!telegramChatId) {
    return {
      ok: false,
      message: "Telegram chat binding is required.",
    } satisfies TelegramCallbackActionResult;
  }

  const user = await db.user.findFirst({
    where: {
      telegramChatId,
    },
  });

  if (!user) {
    return {
      ok: false,
      message: "Application user not found.",
    } satisfies TelegramCallbackActionResult;
  }

  const payload = decodeTelegramCallbackPayload(callbackData);

  if (payload.action === TELEGRAM_ACTIONS.COMPLETE_REMINDER) {
    return completeReminderFromNotification(user.id, payload.reminderId);
  }

  if (payload.action === TELEGRAM_ACTIONS.SNOOZE_REMINDER) {
    return snoozeReminderFromNotification(user.id, payload.reminderId, payload.minutes);
  }

  return acknowledgeTimetableNotification(user.id, payload.timetableEntryId, payload.occurrenceKey ?? null);
}
