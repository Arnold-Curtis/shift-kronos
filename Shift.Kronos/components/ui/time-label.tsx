"use client";

import { useEffect, useState } from "react";

type TimeLabelProps = {
  date: Date | string | null;
  className?: string;
  fallback?: string;
};

function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (Math.abs(diffMins) < 1) return "now";

  if (diffMins > 0 && diffMins < 60) return `in ${diffMins}m`;
  if (diffMins < 0 && diffMins > -60) return `${Math.abs(diffMins)}m ago`;

  if (diffHours > 0 && diffHours < 24) return `in ${diffHours}h`;
  if (diffHours < 0 && diffHours > -24) return `${Math.abs(diffHours)}h ago`;

  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }

  if (Math.abs(diffDays) < 7) {
    return date.toLocaleDateString([], { weekday: "short" }) +
      " " +
      date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " +
    date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function TimeLabel({ date, className, fallback = "No time set" }: TimeLabelProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!date) {
      return;
    }
    const interval = setInterval(() => {
      setTick((value) => value + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, [date]);

  void tick;

  if (!date) {
    return <span className={className}>{fallback}</span>;
  }

  const resolvedDate = typeof date === "string" ? new Date(date) : date;
  const label = formatRelative(resolvedDate);

  return <span className={className}>{label}</span>;
}
