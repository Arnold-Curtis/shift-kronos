import { GlassCard } from "@/components/ui/glass-card";
import { TimeLabel } from "@/components/ui/time-label";
import { AlertTriangle } from "lucide-react";

type FocusPanelReminder = {
  id: string;
  title: string;
  dueAt: Date | null;
  description: string | null;
};

type FocusPanelProps = {
  reminders: FocusPanelReminder[];
};

export function FocusPanel({ reminders }: FocusPanelProps) {
  if (reminders.length === 0) return null;

  return (
    <div className="space-y-2 animate-fade-in">
      <h2 className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-widest text-text-tertiary">
        <AlertTriangle size={12} className="text-danger" />
        High Priority
      </h2>
      <div className="space-y-2">
        {reminders.map((reminder) => (
          <GlassCard key={reminder.id} variant="interactive">
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-danger" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-text-primary truncate">
                  {reminder.title}
                </h3>
                {reminder.description && (
                  <p className="mt-0.5 text-xs text-text-tertiary truncate">
                    {reminder.description}
                  </p>
                )}
              </div>
              <TimeLabel
                date={reminder.dueAt}
                className="shrink-0 text-xs font-medium text-danger"
              />
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
