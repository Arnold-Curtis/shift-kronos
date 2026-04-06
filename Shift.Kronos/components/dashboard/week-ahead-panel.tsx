import { SectionCard } from "@/components/dashboard/section-card";
import { ReminderBadge } from "@/components/reminders/reminder-badge";
import { formatDateTimeLabel } from "@/lib/datetime";

type WeekAheadReminderItem = {
  kind: "reminder";
  id: string;
  title: string;
  dueAt: Date | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  description: string | null;
};

type WeekAheadClassItem = {
  kind: "class";
  entryId: string;
  subject: string;
  startsAt: Date;
  location: string | null;
};

type WeekAheadPanelProps = {
  items: Array<WeekAheadReminderItem | WeekAheadClassItem>;
};

export function WeekAheadPanel({ items }: WeekAheadPanelProps) {
  return (
    <SectionCard
      title="Week-ahead preview"
      description="The next seven days of reminders and classes from the same deterministic query layer used elsewhere in the app."
    >
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm leading-6 text-foreground-muted">
          Your week-ahead view is clear right now.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const key = item.kind === "reminder" ? item.id : item.entryId;
            const title = item.kind === "reminder" ? item.title : item.subject;
            const when = item.kind === "reminder" ? item.dueAt : item.startsAt;
            const detail = item.kind === "reminder" ? item.description : item.location;

            return (
              <article key={`${item.kind}-${key}`} className="rounded-2xl border border-border bg-black/10 px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <ReminderBadge label={item.kind} />
                      {item.kind === "reminder" ? (
                        <ReminderBadge priority={item.priority} label={item.priority} />
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-foreground">{title}</h3>
                    {detail ? <p className="mt-1 text-sm leading-6 text-foreground-muted">{detail}</p> : null}
                  </div>

                  <p className="text-sm text-foreground-muted">
                    {when ? formatDateTimeLabel(when) : "Time pending"}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
