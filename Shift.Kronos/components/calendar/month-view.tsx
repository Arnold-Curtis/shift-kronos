"use client";

import type { CalendarEvent } from "@/lib/calendar/queries";

type MonthViewProps = {
  events: CalendarEvent[];
  month: Date;
  onDayClick: (date: Date) => void;
};

const DAY_HEADERS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function getMonthGrid(month: Date): (Date | null)[] {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1);
  const lastDay = new Date(year, m + 1, 0);

  // Monday-based: 0=Mon, 6=Sun
  let startPad = firstDay.getDay() - 1;
  if (startPad < 0) startPad = 6;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, m, d));
  }
  // Pad end to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

export function MonthView({ events, month, onDayClick }: MonthViewProps) {
  const cells = getMonthGrid(month);
  const today = new Date().toDateString();

  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = event.startsAt.toDateString();
    const list = eventsByDay.get(key) || [];
    list.push(event);
    eventsByDay.set(key, list);
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-px mb-1">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-text-tertiary py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {cells.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }

          const dayStr = day.toDateString();
          const isToday = dayStr === today;
          const dayEvents = eventsByDay.get(dayStr) || [];
          const hasReminders = dayEvents.some((e) => e.kind === "reminder");
          const hasClasses = dayEvents.some((e) => e.kind === "class");

          return (
            <button
              key={dayStr}
              type="button"
              onClick={() => onDayClick(day)}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg transition hover:bg-bg-surface-hover"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  isToday
                    ? "bg-accent text-white"
                    : "text-text-primary"
                }`}
              >
                {day.getDate()}
              </span>
              <div className="flex gap-0.5">
                {hasReminders && <span className="h-1 w-1 rounded-full bg-accent-light" />}
                {hasClasses && <span className="h-1 w-1 rounded-full bg-blue" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
