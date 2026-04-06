import { foundationChecklist } from "@/lib/navigation";
import { SectionCard } from "@/components/dashboard/section-card";

export function FoundationStatus() {
  return (
    <SectionCard
      title="Foundation checklist"
      description="Phase 1 builds the reliability baseline that every later feature depends on."
    >
      <ul className="space-y-3">
        {foundationChecklist.map((item) => (
          <li
            key={item}
            className="flex items-start gap-3 rounded-2xl border border-border bg-black/10 px-4 py-3"
          >
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-success" />
            <span className="text-sm leading-6 text-foreground-muted">{item}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
