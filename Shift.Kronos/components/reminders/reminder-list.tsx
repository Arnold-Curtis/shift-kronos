"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { TimeLabel } from "@/components/ui/time-label";
import { ReminderBadge } from "@/components/reminders/reminder-badge";
import { completeReminderAction, reactivateReminderAction } from "@/app/reminders/actions";
import { ListChecks, Check, RotateCcw } from "lucide-react";

type Reminder = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  category: string | null;
  tags: string[];
  dueAt: Date | null;
  status: string;
};

type ReminderListProps = {
  title: string;
  description?: string;
  reminders: Reminder[];
  emptyState: string;
  showReactivate?: boolean;
};

export function ReminderList({
  title,
  reminders,
  emptyState,
  showReactivate,
}: ReminderListProps) {
  if (reminders.length === 0) {
    return (
      <GlassCard>
        <EmptyState icon={ListChecks} title={emptyState} />
      </GlassCard>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="px-1 text-xs font-semibold uppercase tracking-widest text-text-tertiary">
        {title}
        <span className="ml-1.5 text-text-tertiary">{reminders.length}</span>
      </h3>
      <div className="space-y-1.5">
        {reminders.map((reminder) => (
          <GlassCard key={reminder.id} variant="interactive" padding="sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {showReactivate ? (
                  <form action={reactivateReminderAction}>
                    <input type="hidden" name="reminderId" value={reminder.id} />
                    <button
                      type="submit"
                      className="flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary transition hover:bg-bg-surface-hover hover:text-accent-light"
                      title="Reactivate"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </form>
                ) : (
                  <form action={completeReminderAction}>
                    <input type="hidden" name="reminderId" value={reminder.id} />
                    <button
                      type="submit"
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-border-default text-transparent transition hover:border-success hover:bg-success-muted hover:text-success"
                      title="Complete"
                    >
                      <Check size={12} />
                    </button>
                  </form>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className={`truncate text-sm font-medium ${
                    reminder.status === "COMPLETED" ? "line-through text-text-tertiary" : "text-text-primary"
                  }`}>
                    {reminder.title}
                  </h4>
                  <ReminderBadge type={reminder.type} priority={reminder.priority} />
                </div>
                {reminder.description && (
                  <p className="mt-0.5 truncate text-xs text-text-tertiary">{reminder.description}</p>
                )}
              </div>
              <TimeLabel
                date={reminder.dueAt}
                className="shrink-0 text-xs text-text-secondary"
              />
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
