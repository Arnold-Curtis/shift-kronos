"use client";

import { useState } from "react";
import Link from "next/link";
import { ChatComposer } from "@/components/assistant/chat-composer";
import { EmptyState } from "@/components/ui/empty-state";
import { ConversationView } from "@/lib/assistant/types";
import { MessageCircle, PanelLeftOpen, PanelLeftClose, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatPanelProps = {
  conversations: ConversationView[];
  selectedConversation?: ConversationView | null;
  selectedConversationId?: string | null;
};

export function ChatPanel({ conversations, selectedConversation, selectedConversationId }: ChatPanelProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeConversation =
    selectedConversation ?? conversations.find((c) => c.id === selectedConversationId) ?? conversations[0] ?? null;

  return (
    <div className="flex h-[calc(100dvh-140px)] lg:h-[calc(100dvh-96px)] overflow-hidden rounded-2xl border border-border-subtle bg-bg-elevated/50">
      {/* Conversations sidebar */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 z-20 w-72 border-r border-border-subtle bg-bg-base/95 backdrop-blur-xl transition-transform lg:relative lg:translate-x-0 lg:w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
            Conversations
          </h3>
          <div className="flex gap-1">
            <Link
              href="/chat"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary transition hover:bg-bg-surface-hover hover:text-text-primary"
            >
              <Plus size={14} />
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary transition hover:bg-bg-surface-hover hover:text-text-primary lg:hidden"
            >
              <PanelLeftClose size={14} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-2 py-2 space-y-0.5" style={{ maxHeight: "calc(100% - 49px)" }}>
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/chat?conversationId=${conversation.id}`}
              className={cn(
                "block rounded-xl px-3 py-2.5 transition",
                conversation.id === activeConversation?.id
                  ? "bg-accent-muted"
                  : "hover:bg-bg-surface-hover",
              )}
            >
              <p className="truncate text-sm font-medium text-text-primary">
                {conversation.title ?? "New conversation"}
              </p>
              <p className="mt-0.5 truncate text-xs text-text-tertiary">
                {conversation.messages.at(-1)?.content ?? "No messages"}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Chat header */}
        <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition hover:bg-bg-surface-hover hover:text-text-primary lg:hidden"
          >
            <PanelLeftOpen size={16} />
          </button>
          <h2 className="truncate text-sm font-semibold text-text-primary">
            {activeConversation?.title ?? "New conversation"}
          </h2>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {!activeConversation?.messages.length ? (
            <EmptyState
              icon={MessageCircle}
              title="Start a conversation"
              subtitle="Ask about your schedule, create reminders, or just chat."
            />
          ) : (
            activeConversation.messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed animate-fade-in",
                  message.role === "USER"
                    ? "ml-auto bg-accent text-white rounded-br-md"
                    : "mr-auto glass text-text-primary rounded-bl-md",
                )}
              >
                {message.content}
              </div>
            ))
          )}
        </div>

        {/* Composer */}
        <ChatComposer conversationId={activeConversation?.id} />
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
