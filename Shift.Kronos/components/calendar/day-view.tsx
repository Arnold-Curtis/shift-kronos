"use client";

import type { CalendarEvent } from "@/lib/calendar/queries";
import { EventCard } from "@/components/calendar/event-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Clock } from "lucide-react";

type DayViewProps = {
  events: CalendarEvent[];
  date: Date;
  onEventClick: (event: CalendarEvent) => void;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function DayView({ events, date, onEventClick }: DayViewProps) {
  const dayEvents = events.filter(
    (e) => e.startsAt.toDateString() === date.toDateString(),
  );

  if (dayEvents.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Nothing on this day"
        subtitle="Use the mic button to add something."
      />
    );
  }

  const eventsByHour = new Map<number, CalendarEvent[]>();
  for (const event of dayEvents) {
    const hour = event.startsAt.getHours();
    const list = eventsByHour.get(hour) || [];
    list.push(event);
    eventsByHour.set(hour, list);
  }

  const firstHour = Math.min(...dayEvents.map((e) => e.startsAt.getHours()));
  const lastHour = Math.max(...dayEvents.map((e) => e.startsAt.getHours()));
  const visibleHours = HOURS.filter(
    (h) => h >= Math.max(0, firstHour - 1) && h <= Math.min(23, lastHour + 1),
  );

  return (
    <div className="space-y-px">
      {visibleHours.map((hour) => {
        const hourEvents = eventsByHour.get(hour) || [];
        const label = `${hour.toString().padStart(2, "0")}:00`;

        return (
          <div key={hour} className="flex gap-3">
            <span className="w-12 shrink-0 pt-2 text-right text-xs text-text-tertiary">
              {label}
            </span>
            <div className="flex-1 border-t border-border-subtle py-1.5 min-h-[44px]">
              {hourEvents.length > 0 ? (
                <div className="space-y-1">
                  {hourEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick(event)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
