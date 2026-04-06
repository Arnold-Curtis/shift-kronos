"use client";

import type { CalendarEvent } from "@/lib/calendar/queries";
import { EventCard } from "@/components/calendar/event-card";

type WeekViewProps = {
  events: CalendarEvent[];
  weekStart: Date;
  onEventClick: (event: CalendarEvent) => void;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekDays(start: Date): Date[] {
  const days: Date[] = [];
  const d = new Date(start);
  // Adjust to Monday
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  for (let i = 0; i < 7; i++) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export function WeekView({ events, weekStart, onEventClick }: WeekViewProps) {
  const days = getWeekDays(weekStart);
  const today = new Date().toDateString();

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day, i) => {
        const dayStr = day.toDateString();
        const isToday = dayStr === today;
        const dayEvents = events.filter(
          (e) => e.startsAt.toDateString() === dayStr,
        );

        return (
          <div key={i} className="min-h-[120px]">
            <div className="flex flex-col items-center gap-0.5 pb-2">
              <span className="text-[10px] font-medium text-text-tertiary">
                {DAY_LABELS[i]}
              </span>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  isToday
                    ? "bg-accent text-white"
                    : "text-text-primary"
                }`}
              >
                {day.getDate()}
              </span>
            </div>
            <div className="space-y-0.5">
              {dayEvents.slice(0, 3).map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  compact
                  onClick={() => onEventClick(event)}
                />
              ))}
              {dayEvents.length > 3 && (
                <p className="px-1 text-[9px] text-text-tertiary">
                  +{dayEvents.length - 3}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
