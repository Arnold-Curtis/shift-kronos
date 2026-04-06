import { getServerEnv } from "@/lib/env";
import { TelegramSendMessageInput, TelegramSendMessageResult } from "@/lib/notifications/types";
import { logWarn } from "@/lib/observability/logger";

type TelegramApiResponse = {
  ok: boolean;
  result?: {
    message_id?: number;
  };
  description?: string;
};

export async function sendTelegramMessage(input: TelegramSendMessageInput): Promise<TelegramSendMessageResult> {
  const env = getServerEnv();
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: input.chatId,
      text: input.text,
      reply_markup: input.inlineKeyboard
        ? {
            inline_keyboard: input.inlineKeyboard.map((row) =>
              row.map((button) => ({
                text: button.text,
                callback_data: button.callbackData,
              })),
            ),
          }
        : undefined,
    }),
  });

  const payload = (await response.json()) as TelegramApiResponse;

  if (!response.ok || !payload.ok) {
    return {
      ok: false,
      messageId: null,
      errorMessage: payload.description ?? `Telegram send failed with status ${response.status}`,
    };
  }

  return {
    ok: true,
    messageId: payload.result?.message_id ? String(payload.result.message_id) : null,
    errorMessage: null,
  };
}

export async function answerTelegramCallbackQuery(callbackQueryId: string, text: string) {
  const env = getServerEnv();

  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  });

  if (!response.ok) {
    logWarn("telegram.callback-query.failed", {
      status: response.status,
    });
  }
}

export async function sendPlainTelegramMessage(chatId: string, text: string) {
  return sendTelegramMessage({
    chatId,
    text,
  });
}
