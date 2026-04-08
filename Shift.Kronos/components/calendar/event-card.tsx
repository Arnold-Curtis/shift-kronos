"use client";

import type { CalendarEvent } from "@/lib/calendar/queries";

type EventCardProps = {
  event: CalendarEvent;
  compact?: boolean;
  onClick?: () => void;
};

const kindColors = {
  reminder: {
    dot: "bg-accent-light",
    border: "border-l-accent-light",
    bg: "hover:bg-accent-muted/30",
  },
  class: {
    dot: "bg-blue",
    border: "border-l-blue",
    bg: "hover:bg-blue-muted/30",
  },
};

export function EventCard({ event, compact, onClick }: EventCardProps) {
  const style = kindColors[event.kind];
  const timeStr = event.startsAt.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition ${style.bg}`}
      >
        <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
        <span className="truncate text-[10px] text-text-primary">{event.title}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border-l-2 ${style.border} glass-interactive px-3 py-2.5 text-left`}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="truncate text-sm font-medium text-text-primary">{event.title}</h4>
        <span className="shrink-0 text-xs text-text-secondary">{timeStr}</span>
      </div>
      {event.detail && (
        <p className="mt-0.5 truncate text-xs text-text-tertiary">{event.detail}</p>
      )}
    </button>
  );
}
