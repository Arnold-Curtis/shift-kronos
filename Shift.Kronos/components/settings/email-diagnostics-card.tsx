"use client";

import { useActionState, useEffect } from "react";
import { dispatchNotificationsAction, sendEmailTestMessageAction } from "@/app/settings/actions";
import { INITIAL_ME_ACTION_STATE } from "@/app/me/action-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { useToast } from "@/components/ui/toast";

type EmailDiagnosticsCardProps = {
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

function formatFailureTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function EmailDiagnosticsCard({
  userEmailAddress,
  fallbackEmailAddress,
  resolvedEmailAddress,
  recentFailures,
}: EmailDiagnosticsCardProps) {
  const { addToast } = useToast();
  const [testState, testAction] = useActionState(sendEmailTestMessageAction, INITIAL_ME_ACTION_STATE);
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
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Account email</p>
          <p className="mt-2 break-all text-sm text-text-primary">{userEmailAddress ?? "Not available"}</p>
        </div>
        <div className="rounded-2xl border border-border bg-black/10 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Fallback email</p>
          <p className="mt-2 break-all text-sm text-text-primary">{fallbackEmailAddress ?? "Not configured"}</p>
        </div>
        <div className="rounded-2xl border border-border bg-black/10 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Resolved destination</p>
          <p className="mt-2 break-all text-sm font-semibold text-text-primary">
            {resolvedEmailAddress ?? "No delivery destination"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-black/10 px-4 py-4 text-sm leading-6 text-text-secondary">
        Email delivery uses the signed-in account email first, then falls back to <code>NOTIFICATION_TO_EMAIL</code>. Each action link in the email is signed and expires automatically.
      </div>

      <form action={testAction} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary">Delivery probe</p>
          <p className="text-xs text-text-tertiary">Sends a live test message through the app&apos;s email transport.</p>
        </div>
        <SubmitButton idleLabel="Send email test" pendingLabel="Sending email test" className="btn-primary w-full sm:w-auto" />
      </form>

      <form action={dispatchAction} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary">Dispatch pending notifications</p>
          <p className="text-xs text-text-tertiary">Runs the full notification pipeline for all due reminders and timetable events.</p>
        </div>
        <SubmitButton idleLabel="Dispatch now" pendingLabel="Dispatching" className="btn-secondary w-full sm:w-auto" />
      </form>

      <div>
        <p className="text-sm font-semibold text-text-primary">Recent email failures</p>
        {recentFailures.length === 0 ? (
          <p className="mt-2 text-sm text-text-tertiary">No recent email delivery failures recorded.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {recentFailures.map((failure) => (
              <div key={failure.id} className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3">
                <p className="text-sm font-medium text-rose-100">{failure.sourceType} delivery failed</p>
                <p className="mt-1 text-sm text-rose-100/90">{failure.failureReason ?? "Unknown email failure."}</p>
                <p className="mt-2 text-xs text-rose-100/70">{formatFailureTime(new Date(failure.createdAt))}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
