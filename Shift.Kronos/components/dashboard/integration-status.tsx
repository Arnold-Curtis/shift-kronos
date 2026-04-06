import { integrationStatus } from "@/lib/placeholders";
import { SectionCard } from "@/components/dashboard/section-card";

export function IntegrationStatus() {
  return (
    <SectionCard
      title="Integration boundaries"
      description="These boundaries are intentionally separated so reminders and delivery logic can grow without entangling the app shell."
    >
      <div className="grid gap-3 md:grid-cols-2">
        {integrationStatus.map((item) => (
          <article
            key={item.name}
            className="rounded-2xl border border-border bg-black/10 px-4 py-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
              <span className="rounded-full border border-border px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-foreground-muted">
                {item.state}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-foreground-muted">{item.detail}</p>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
