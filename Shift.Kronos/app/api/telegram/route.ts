import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLatestConversationBySource } from "@/lib/assistant/conversations";
import { sendPlainTelegramMessage } from "@/lib/notifications/telegram";
import { answerTelegramCallbackQuery } from "@/lib/notifications/telegram";
import { handleTelegramCallbackAction } from "@/lib/notifications/callback-actions";
import { runAssistantWorkflow } from "@/lib/assistant/service";
import { ASSISTANT_INPUT_SOURCE } from "@/lib/assistant/types";
import { isAuthorizedTelegramWebhookRequest } from "@/lib/operations/auth";
import { logError, logInfo, logWarn } from "@/lib/observability/logger";

type TelegramUpdate = {
  callback_query?: {
    id: string;
    data?: string;
    from?: {
      id?: number;
    };
  };
  message?: {
    text?: string;
    chat?: {
      id?: number;
    };
  };
};

export async function POST(request: Request) {
  if (!isAuthorizedTelegramWebhookRequest(request)) {
    logWarn("telegram.webhook.unauthorized", {
      path: new URL(request.url).pathname,
    });

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as TelegramUpdate;
    const callbackQuery = payload.callback_query;
    const message = payload.message;

    if (message?.text && message.chat?.id) {
      const chatId = String(message.chat.id);
      const user = await db.user.findFirst({
        where: {
          telegramChatId: chatId,
        },
      });

      if (!user) {
        logWarn("telegram.webhook.unlinked-chat", {
          chatId,
        });

        await sendPlainTelegramMessage(
          chatId,
          "Your Telegram chat is not linked to an application user yet. Link it in Shift:Kronos settings first.",
        );

        return NextResponse.json({ ok: false, message: "Application user not found." });
      }

      const result = await runAssistantWorkflow({
        userId: user.id,
        input: message.text,
        source: ASSISTANT_INPUT_SOURCE.TELEGRAM,
        conversationId: (await getLatestConversationBySource(user.id, ASSISTANT_INPUT_SOURCE.TELEGRAM))?.id,
      });

      await sendPlainTelegramMessage(chatId, result.message);

      logInfo("telegram.webhook.message-processed", {
        userId: user.id,
        chatId,
        resultKind: result.kind,
      });

      return NextResponse.json({ ok: true, message: result.message });
    }

    if (!callbackQuery?.data) {
      logInfo("telegram.webhook.ignored", {
        hasMessage: Boolean(message),
        hasCallback: Boolean(callbackQuery),
      });

      return NextResponse.json({ ok: true });
    }

    const result = await handleTelegramCallbackAction(
      callbackQuery.from?.id ? String(callbackQuery.from.id) : null,
      callbackQuery.data,
    );

    await answerTelegramCallbackQuery(callbackQuery.id, result.message);

    logInfo("telegram.webhook.callback-processed", {
      ok: result.ok,
      actorId: callbackQuery.from?.id ? String(callbackQuery.from.id) : null,
    });

    return NextResponse.json({ ok: result.ok, message: result.message });
  } catch (error) {
    logError("telegram.webhook.failed", {
      path: new URL(request.url).pathname,
      error,
    });

    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
