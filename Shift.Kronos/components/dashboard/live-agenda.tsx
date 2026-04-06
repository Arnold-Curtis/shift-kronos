import { SectionCard } from "@/components/dashboard/section-card";
import { formatDateTimeLabel } from "@/lib/datetime";

type AgendaItem = {
  kind: "reminder" | "class";
  id: string;
  title: string;
  startsAt: Date | null;
  detail: string | null;
};

type LiveAgendaProps = {
  items: AgendaItem[];
};

export function LiveAgenda({ items }: LiveAgendaProps) {
  return (
    <SectionCard title="Today's agenda" description="Classes and reminders are merged into one deterministic daily view.">
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm leading-6 text-foreground-muted">
          Nothing is scheduled for today yet.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={`${item.kind}-${item.id}`} className="rounded-2xl border border-border bg-black/10 px-4 py-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-accent">{item.kind}</p>
                  <h3 className="mt-2 text-base font-semibold text-foreground">{item.title}</h3>
                  {item.detail ? <p className="mt-1 text-sm text-foreground-muted">{item.detail}</p> : null}
                </div>
                <p className="text-sm text-foreground-muted">
                  {item.startsAt ? formatDateTimeLabel(item.startsAt) : "Time pending"}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
