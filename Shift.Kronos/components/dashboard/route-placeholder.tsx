import { SectionCard } from "@/components/dashboard/section-card";

type RoutePlaceholderProps = {
  title: string;
  summary: string;
  nextSteps: string[];
};

export function RoutePlaceholder({ title, summary, nextSteps }: RoutePlaceholderProps) {
  return (
    <SectionCard title={title} description={summary}>
      <ul className="space-y-3">
        {nextSteps.map((step) => (
          <li key={step} className="rounded-2xl border border-border bg-black/10 px-4 py-3 text-sm leading-6 text-foreground-muted">
            {step}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
