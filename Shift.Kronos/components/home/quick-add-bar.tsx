"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Send } from "lucide-react";
import { INITIAL_ASSISTANT_ACTION_STATE } from "@/app/chat/action-state";
import { submitQuickCaptureAction } from "@/app/chat/actions";

export function QuickAddBar() {
  const [state, action, isPending] = useActionState(
    submitQuickCaptureAction,
    INITIAL_ASSISTANT_ACTION_STATE,
  );

  const conversationId = state.conversationId;

  return (
    <div className="animate-fade-in">
      <form action={action} className="relative">
        <input type="hidden" name="conversationId" value={conversationId ?? ""} />
        <input
          type="text"
          name="input"
          required
          placeholder="Add a reminder, task, or note..."
          className="input-field pr-12"
          disabled={isPending}
        />
        <button
          type="submit"
          disabled={isPending}
          aria-label="Send"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:text-accent-light disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>

      {state.status !== "idle" && (
        <div
          className={`mt-2 rounded-xl px-3 py-2 text-xs leading-5 animate-fade-in ${
            state.status === "success"
              ? "bg-success-muted text-success"
              : "bg-danger-muted text-danger"
          }`}
        >
          {state.message}
          {state.status === "success" && conversationId ? (
            <div className="mt-2">
              <Link href={`/chat?conversationId=${conversationId}`} className="font-semibold underline underline-offset-2">
                Continue in chat
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
