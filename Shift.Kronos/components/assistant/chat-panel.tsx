import { submitChatMessageAction } from "@/app/chat/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { ConversationView } from "@/lib/assistant/types";

type ChatPanelProps = {
  conversations: ConversationView[];
};

export function ChatPanel({ conversations }: ChatPanelProps) {
  const activeConversation = conversations[0] ?? null;

  return (
    <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-3xl border border-border bg-panel px-5 py-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Recent conversations</p>
          <p className="text-sm leading-6 text-foreground-muted">
            Conversations persist per user so the assistant can maintain grounded continuity across sessions instead of acting like a stateless chat box.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {conversations.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-foreground-muted">
              No assistant conversations yet. Send a message from the panel on the right to begin.
            </p>
          ) : (
            conversations.map((conversation) => (
              <article key={conversation.id} className="rounded-2xl border border-border bg-black/10 px-4 py-4 break-words">
                <p className="text-sm font-semibold text-foreground">
                  {conversation.title ?? "Untitled conversation"}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-accent">{conversation.source}</p>
                <p className="mt-2 text-sm text-foreground-muted">
                  {conversation.messages.at(-1)?.content ?? "No messages yet."}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-panel px-5 py-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Assistant chat</p>
          <p className="text-sm leading-6 text-foreground-muted">
            Ask about your current reminders and timetable, pull in retrieval-backed knowledge, or create reminders in natural language.
          </p>
        </div>

        <div className="mt-4 space-y-3 rounded-2xl border border-border bg-black/10 px-4 py-4">
          {activeConversation?.messages.length ? (
            activeConversation.messages.map((message) => (
              <article key={message.id} className="rounded-2xl border border-border bg-panel px-4 py-3 break-words">
                <p className="text-xs uppercase tracking-[0.18em] text-accent">{message.role}</p>
                <p className="mt-2 text-sm leading-6 text-foreground">{message.content}</p>
              </article>
            ))
          ) : (
            <p className="text-sm text-foreground-muted">
              No messages yet. Try asking, &quot;What do I have today?&quot; or &quot;Remind me to revise tomorrow at 8pm&quot;.
            </p>
          )}
        </div>

        <form action={submitChatMessageAction} className="mt-4 grid gap-3">
          <input type="hidden" name="conversationId" value={activeConversation?.id ?? ""} />
          <textarea
            name="message"
            rows={4}
            placeholder="Ask about your schedule or create a reminder"
            className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none"
          />
          <SubmitButton
            idleLabel="Send to assistant"
            pendingLabel="Sending"
            className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 sm:w-auto"
          />
        </form>
      </section>
    </div>
  );
}
