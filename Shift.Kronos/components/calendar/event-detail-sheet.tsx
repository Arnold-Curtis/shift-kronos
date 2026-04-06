"use client";

import type { CalendarEvent } from "@/lib/calendar/queries";
import { GlassCard } from "@/components/ui/glass-card";
import { X, Clock, MapPin } from "lucide-react";
import { TimeLabel } from "@/components/ui/time-label";

type EventDetailSheetProps = {
  event: CalendarEvent | null;
  onClose: () => void;
};

export function EventDetailSheet({ event, onClose }: EventDetailSheetProps) {
  if (!event) return null;

  const kindLabel = event.kind === "class" ? "Class" : "Reminder";
  const kindColor = event.kind === "class" ? "text-blue" : "text-accent-light";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center lg:items-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md animate-slide-in-up lg:animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <GlassCard variant="strong" padding="lg" className="rounded-t-2xl lg:rounded-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className={`text-xs font-semibold uppercase tracking-widest ${kindColor}`}>
                {kindLabel}
              </span>
              <h3 className="mt-1 text-lg font-bold text-text-primary">{event.title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-tertiary transition hover:bg-bg-surface-hover hover:text-text-primary"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2.5 text-sm text-text-secondary">
              <Clock size={14} className="shrink-0 text-text-tertiary" />
              <TimeLabel date={event.startsAt} className="font-medium" />
              {event.endsAt && (
                <>
                  <span className="text-text-tertiary">→</span>
                  <TimeLabel date={event.endsAt} className="font-medium" />
                </>
              )}
            </div>

            {event.detail && (
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <MapPin size={14} className="shrink-0 text-text-tertiary" />
                <span>{event.detail}</span>
              </div>
            )}
          </div>

          {event.kind === "reminder" && (
            <div className="mt-5 flex gap-2">
              <button className="btn-primary flex-1 text-sm">Mark Complete</button>
              <button className="btn-ghost flex-1 text-sm">Snooze</button>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
