"use client";

import { useActionState, useEffect } from "react";
import { sendTelegramTestMessageAction, dispatchNotificationsAction } from "@/app/settings/actions";
import { INITIAL_ME_ACTION_STATE } from "@/app/me/action-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { useToast } from "@/components/ui/toast";

type TelegramDiagnosticsCardProps = {
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

function formatFailureTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function TelegramDiagnosticsCard({
  userTelegramChatId,
  fallbackTelegramChatId,
  resolvedTelegramChatId,
  recentFailures,
}: TelegramDiagnosticsCardProps) {
  const { addToast } = useToast();
  const [testState, testAction] = useActionState(sendTelegramTestMessageAction, INITIAL_ME_ACTION_STATE);
  const [dispatchState, dispatchAction] = useActionState(dispatchNotificationsAction, INITIAL_ME_ACTION_STATE);

  useEffect(() => {
    if (testState.status === "success" && testState.message) {
      addToast("success", testState.message);
    }

    if (testState.status === "error" && testState.message) {
      addToast("error", testState.message);
    }
  }, [addToast, testState]);

  useEffect(() => {
    if (dispatchState.status === "success" && dispatchState.message) {
      addToast("success", dispatchState.message);
    }

    if (dispatchState.status === "error" && dispatchState.message) {
      addToast("error", dispatchState.message);
    }
  }, [addToast, dispatchState]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-black/10 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">User chat id</p>
          <p className="mt-2 break-all text-sm text-text-primary">{userTelegramChatId ?? "Not linked"}</p>
        </div>
        <div className="rounded-2xl border border-border bg-black/10 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Fallback chat id</p>
          <p className="mt-2 break-all text-sm text-text-primary">{fallbackTelegramChatId ?? "Not configured"}</p>
        </div>
        <div className="rounded-2xl border border-border bg-black/10 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Resolved destination</p>
          <p className="mt-2 break-all text-sm font-semibold text-text-primary">
            {resolvedTelegramChatId ?? "No delivery destination"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-black/10 px-4 py-4 text-sm leading-6 text-text-secondary">
        Telegram delivery uses the linked user chat id first, then falls back to <code>TELEGRAM_CHAT_ID</code>. Use the test button below after starting your bot conversation in Telegram.
      </div>

      <form action={testAction} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary">Delivery probe</p>
          <p className="text-xs text-text-tertiary">Sends a live test message through the app&apos;s Telegram transport.</p>
        </div>
        <SubmitButton idleLabel="Send Telegram test" pendingLabel="Sending Telegram test" className="btn-primary w-full sm:w-auto" />
      </form>

      <form action={dispatchAction} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary">Dispatch pending notifications</p>
          <p className="text-xs text-text-tertiary">Runs the full notification pipeline for all due reminders and timetable events.</p>
        </div>
        <SubmitButton idleLabel="Dispatch now" pendingLabel="Dispatching" className="btn-secondary w-full sm:w-auto" />
      </form>

      <div>
        <p className="text-sm font-semibold text-text-primary">Recent Telegram failures</p>
        {recentFailures.length === 0 ? (
          <p className="mt-2 text-sm text-text-tertiary">No recent Telegram delivery failures recorded.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {recentFailures.map((failure) => (
              <div key={failure.id} className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3">
                <p className="text-sm font-medium text-rose-100">{failure.sourceType} delivery failed</p>
                <p className="mt-1 text-sm text-rose-100/90">{failure.failureReason ?? "Unknown Telegram failure."}</p>
                <p className="mt-2 text-xs text-rose-100/70">{formatFailureTime(new Date(failure.createdAt))}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
