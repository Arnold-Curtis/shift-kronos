import { ChatComposer } from "@/components/assistant/chat-composer";
import { ConversationView } from "@/lib/assistant/types";

type ChatPanelProps = {
  conversations: ConversationView[];
  selectedConversationId?: string | null;
};

export function ChatPanel({ conversations, selectedConversationId }: ChatPanelProps) {
  const activeConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) ?? conversations[0] ?? null;

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

        <ChatComposer conversationId={activeConversation?.id} />
      </section>
    </div>
  );
}
