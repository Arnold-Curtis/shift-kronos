"use client";

import { useState } from "react";
import type { CalendarEvent } from "@/lib/calendar/queries";
import { DayView } from "@/components/calendar/day-view";
import { WeekView } from "@/components/calendar/week-view";
import { MonthView } from "@/components/calendar/month-view";
import { EventDetailSheet } from "@/components/calendar/event-detail-sheet";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CalendarViewProps = {
  events: CalendarEvent[];
};

type ViewMode = "day" | "week" | "month";

export function CalendarView({ events }: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  function navigateBack() {
    const d = new Date(currentDate);
    if (viewMode === "day") d.setDate(d.getDate() - 1);
    else if (viewMode === "week") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  }

  function navigateForward() {
    const d = new Date(currentDate);
    if (viewMode === "day") d.setDate(d.getDate() + 1);
    else if (viewMode === "week") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function handleDayClick(date: Date) {
    setCurrentDate(date);
    setViewMode("day");
  }

  const dateLabel = (() => {
    if (viewMode === "day") {
      return currentDate.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    }
    if (viewMode === "month") {
      return currentDate.toLocaleDateString([], { month: "long", year: "numeric" });
    }
    const start = new Date(currentDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString([], { month: "short", day: "numeric" })} – ${end.toLocaleDateString([], { month: "short", day: "numeric" })}`;
  })();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={navigateBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition hover:bg-bg-surface-hover hover:text-text-primary"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-sm font-semibold text-text-primary min-w-0 truncate">
            {dateLabel}
          </h2>
          <button
            type="button"
            onClick={navigateForward}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition hover:bg-bg-surface-hover hover:text-text-primary"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-bg-surface-hover hover:text-text-primary"
          >
            Today
          </button>
          <div className="flex rounded-lg border border-border-subtle bg-bg-surface p-0.5">
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition ${
                  viewMode === mode
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* View */}
      <div className="glass p-4 animate-fade-in" key={`${viewMode}-${currentDate.toISOString()}`}>
        {viewMode === "day" && (
          <DayView events={events} date={currentDate} onEventClick={setSelectedEvent} />
        )}
        {viewMode === "week" && (
          <WeekView events={events} weekStart={currentDate} onEventClick={setSelectedEvent} />
        )}
        {viewMode === "month" && (
          <MonthView events={events} month={currentDate} onDayClick={handleDayClick} />
        )}
      </div>

      {/* Event detail sheet */}
      <EventDetailSheet event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}
