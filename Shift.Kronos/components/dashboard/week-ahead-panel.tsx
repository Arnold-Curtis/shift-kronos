"use client";

import { GlassCard } from "@/components/ui/glass-card";

type WeekItem = {
  kind: "reminder" | "class";
  id: string;
  title: string;
  startsAt: Date | null;
  detail: string | null;
};

type WeekAheadPanelProps = {
  items: WeekItem[];
};

function groupByDay(items: WeekItem[]): Map<string, WeekItem[]> {
  const groups = new Map<string, WeekItem[]>();
  for (const item of items) {
    const key = item.startsAt
      ? item.startsAt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
      : "Unscheduled";
    const list = groups.get(key) || [];
    list.push(item);
    groups.set(key, list);
  }
  return groups;
}

export function WeekAheadPanel({ items }: WeekAheadPanelProps) {
  if (items.length === 0) return null;

  const grouped = groupByDay(items);

  return (
    <div className="space-y-2 animate-fade-in">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-widest text-text-tertiary">
        Coming Up
      </h2>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {Array.from(grouped.entries()).map(([day, dayItems]) => (
          <GlassCard
            key={day}
            variant="interactive"
            padding="sm"
            className="min-w-[200px] shrink-0"
          >
            <p className="text-xs font-semibold text-accent-light">{day}</p>
            <div className="mt-2 space-y-1.5">
              {dayItems.slice(0, 4).map((item) => (
                <div key={`${item.kind}-${item.id}`} className="flex items-center gap-2">
                  <div
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      item.kind === "class" ? "bg-blue" : "bg-accent-light"
                    }`}
                  />
                  <span className="truncate text-xs text-text-primary">{item.title}</span>
                </div>
              ))}
              {dayItems.length > 4 && (
                <p className="text-[10px] text-text-tertiary">+{dayItems.length - 4} more</p>
              )}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
