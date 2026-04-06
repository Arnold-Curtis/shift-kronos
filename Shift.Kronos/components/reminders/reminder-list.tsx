import { completeReminderAction, reactivateReminderAction } from "@/app/reminders/actions";
import { SectionCard } from "@/components/dashboard/section-card";
import { SubmitButton } from "@/components/forms/submit-button";
import { ReminderBadge } from "@/components/reminders/reminder-badge";
import { formatDateTimeLabel } from "@/lib/datetime";
import { ReminderViewModel } from "@/lib/reminders/types";

type ReminderListProps = {
  title: string;
  description: string;
  reminders: ReminderViewModel[];
  emptyState: string;
  showReactivate?: boolean;
};

export function ReminderList({ title, description, reminders, emptyState, showReactivate }: ReminderListProps) {
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
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <ReminderBadge type={reminder.type} />
                    <ReminderBadge priority={reminder.priority} label={reminder.priority} />
                    {reminder.category ? <ReminderBadge label={reminder.category} /> : null}
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-foreground">{reminder.title}</h3>
                    {reminder.description ? (
                      <p className="mt-1 text-sm leading-6 text-foreground-muted">{reminder.description}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-foreground-muted">
                    {reminder.dueAt ? <span>Due {formatDateTimeLabel(reminder.dueAt)}</span> : <span>Unscheduled</span>}
                    {reminder.recurrenceLabel ? <span>{reminder.recurrenceLabel}</span> : null}
                    {reminder.countdownDays !== null ? <span>{reminder.countdownDays} days remaining</span> : null}
                    {reminder.tags.length > 0 ? <span>Tags: {reminder.tags.join(", ")}</span> : null}
                  </div>
                </div>

                <form action={showReactivate ? reactivateReminderAction : completeReminderAction}>
                  <input type="hidden" name="id" value={reminder.id} />
                  <SubmitButton
                    idleLabel={showReactivate ? "Mark active" : "Complete"}
                    pendingLabel={showReactivate ? "Reactivating" : "Completing"}
                    className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground-muted transition hover:border-white/20 hover:text-foreground"
                  />
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
