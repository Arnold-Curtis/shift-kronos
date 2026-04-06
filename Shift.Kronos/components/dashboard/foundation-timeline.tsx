import { formatRelativeWindow } from "@/lib/utils";
import { SectionCard } from "@/components/dashboard/section-card";

const timelineItems = [
  {
    title: "Application shell",
    window: formatRelativeWindow("Now", "Phase 1"),
    detail: "Lock the app structure, navigation model, and dark-first visual baseline.",
  },
  {
    title: "Data backbone",
    window: formatRelativeWindow("Phase 1", "Phase 2"),
    detail: "Create the schema and access patterns that reminders and timetable features can safely build on.",
  },
  {
    title: "Reliable delivery",
    window: formatRelativeWindow("Phase 2", "Phase 3"),
    detail: "Add scheduler and Telegram delivery as deterministic operational layers.",
  },
];

export function FoundationTimeline() {
  return (
    <SectionCard
      title="Build order"
      description="The foundation intentionally prioritizes reliability before advanced intelligence."
    >
      <ol className="space-y-3">
        {timelineItems.map((item, index) => (
          <li key={item.title} className="rounded-2xl border border-border bg-black/10 px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="text-xs uppercase tracking-[0.18em] text-foreground-muted">
                    {item.window}
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-foreground-muted">{item.detail}</p>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}
