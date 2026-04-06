import { SectionCard } from "@/components/dashboard/section-card";
import { ReminderBadge } from "@/components/reminders/reminder-badge";
import { ReminderViewModel } from "@/lib/reminders/types";

type FocusPanelProps = {
  title: string;
  description: string;
  reminders: ReminderViewModel[];
  emptyState: string;
};

export function FocusPanel({ title, description, reminders, emptyState }: FocusPanelProps) {
  return (
    <SectionCard title={title} description={description}>
      {reminders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm leading-6 text-foreground-muted">
          {emptyState}
        </p>
      ) : (
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <article key={reminder.id} className="rounded-2xl border border-border bg-black/10 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{reminder.title}</h3>
                  {reminder.description ? <p className="mt-1 text-sm leading-6 text-foreground-muted">{reminder.description}</p> : null}
                </div>
                <ReminderBadge priority={reminder.priority} label={reminder.priority} />
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
