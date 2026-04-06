"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2 } from "lucide-react";
import { INITIAL_ASSISTANT_ACTION_STATE } from "@/app/chat/action-state";
import { submitChatMessageAction } from "@/app/chat/actions";

type ChatComposerProps = {
  conversationId?: string;
};

export function ChatComposer({ conversationId }: ChatComposerProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [state, formAction, isPending] = useActionState(
    submitChatMessageAction,
    INITIAL_ASSISTANT_ACTION_STATE,
  );

  useEffect(() => {
    if (state.status !== "success") return;
    formRef.current?.reset();
    if (inputRef.current) inputRef.current.style.height = "auto";

    const nextConversationId = state.conversationId ?? conversationId;
    router.push(nextConversationId ? `/chat?conversationId=${nextConversationId}` : "/chat");
    router.refresh();
  }, [conversationId, router, state.conversationId, state.status]);

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex items-end gap-2 border-t border-border-subtle px-4 py-3"
    >
      <input type="hidden" name="conversationId" value={conversationId ?? ""} />
      <textarea
        ref={inputRef}
        name="message"
        rows={1}
        required
        placeholder="Ask anything..."
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={isPending}
        className="flex-1 resize-none rounded-xl border border-border-subtle bg-bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-1 focus:ring-accent-muted disabled:opacity-50"
        style={{ maxHeight: 120 }}
      />
      <button
        type="submit"
        disabled={isPending}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition hover:bg-[#6D28D9] disabled:opacity-50"
      >
        {isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
      </button>
    </form>
  );
}
