import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { TimeLabel } from "@/components/ui/time-label";
import { Clock } from "lucide-react";

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

const kindStyles = {
  reminder: {
    dot: "bg-accent-light",
    badge: "bg-accent-muted text-accent-light",
    label: "Reminder",
  },
  class: {
    dot: "bg-blue",
    badge: "bg-blue-muted text-blue",
    label: "Class",
  },
};

export function LiveAgenda({ items }: LiveAgendaProps) {
  if (items.length === 0) {
    return (
      <GlassCard>
        <EmptyState
          icon={Clock}
          title="Nothing scheduled today"
          subtitle="Use the mic button or type above to add something."
        />
      </GlassCard>
    );
  }

  return (
    <div className="space-y-2 animate-fade-in">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-widest text-text-tertiary">
        Today
      </h2>
      <div className="space-y-2">
        {items.map((item, i) => {
          const style = kindStyles[item.kind];
          return (
            <GlassCard
              key={`${item.kind}-${item.id}`}
              variant="interactive"
              className="animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` } as React.CSSProperties}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary truncate">
                      {item.title}
                    </h3>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
                      {style.label}
                    </span>
                  </div>
                  {item.detail && (
                    <p className="mt-0.5 text-xs text-text-tertiary truncate">{item.detail}</p>
                  )}
                </div>
                <TimeLabel
                  date={item.startsAt}
                  className="shrink-0 text-xs font-medium text-text-secondary"
                  fallback="No time"
                />
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
