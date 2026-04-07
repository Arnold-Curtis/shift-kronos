"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { INITIAL_ASSISTANT_ACTION_STATE } from "@/app/chat/action-state";
import { submitChatMessageAction } from "@/app/chat/actions";
import { SubmitButton } from "@/components/forms/submit-button";

type ChatComposerProps = {
  conversationId?: string;
};

export function ChatComposer({ conversationId }: ChatComposerProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(submitChatMessageAction, INITIAL_ASSISTANT_ACTION_STATE);

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    formRef.current?.reset();

    const nextConversationId = state.conversationId ?? conversationId;
    router.push(nextConversationId ? `/chat?conversationId=${nextConversationId}` : "/chat");
    router.refresh();
  }, [conversationId, router, state.conversationId, state.status]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 grid gap-3">
      <input type="hidden" name="conversationId" value={conversationId ?? ""} />
      <textarea
        name="message"
        rows={4}
        required
        placeholder="Ask about your schedule or create a reminder"
        className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none"
      />
      <SubmitButton
        idleLabel="Send to assistant"
        pendingLabel="Sending"
        className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 sm:w-auto"
      />

      {state.status === "error" ? (
        <p className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
