"use client";

import { GlassCard } from "@/components/ui/glass-card";

export default function CalendarError() {
  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-bold text-text-primary">Calendar</h1>
      <GlassCard>
        <p className="text-sm text-danger">Something went wrong loading the calendar.</p>
      </GlassCard>
    </div>
  );
}
