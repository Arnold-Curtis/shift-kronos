"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Inbox as InboxIcon } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";

type InboxItem = {
  id: string;
  title: string;
  description: string | null;
};

type InboxPreviewProps = {
  items: InboxItem[];
};

export function InboxPreview({ items }: InboxPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const displayItems = expanded ? items : items.slice(0, 3);

  return (
    <GlassCard className="animate-fade-in" padding="none">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning-muted">
            <InboxIcon size={14} className="text-warning" />
          </div>
          <span className="text-sm font-semibold text-text-primary">Inbox</span>
          {items.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warning-muted px-1.5 text-[10px] font-bold text-warning">
              {items.length}
            </span>
          )}
        </div>
        {items.length > 0 &&
          (expanded ? (
            <ChevronUp size={16} className="text-text-tertiary" />
          ) : (
            <ChevronDown size={16} className="text-text-tertiary" />
          ))}
      </button>

      {items.length === 0 ? (
        <div className="px-4 pb-4">
          <EmptyState
            icon={InboxIcon}
            title="Inbox is clear"
            subtitle="Quick captures and unscheduled items show up here."
          />
        </div>
      ) : (
        <div className="border-t border-border-subtle">
          {displayItems.map((item, i) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 px-4 py-3 ${
                i < displayItems.length - 1 ? "border-b border-border-subtle" : ""
              }`}
            >
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-warning" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 text-xs text-text-tertiary truncate">{item.description}</p>
                )}
              </div>
            </div>
          ))}
          {items.length > 3 && !expanded && (
            <div className="px-4 py-2 text-center">
              <span className="text-xs text-text-tertiary">
                +{items.length - 3} more
              </span>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
