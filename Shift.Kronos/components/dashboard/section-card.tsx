import { GlassCard } from "@/components/ui/glass-card";

type SectionCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

/** @deprecated Use GlassCard directly in new code. */
export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <GlassCard>
      <div className="mb-3 space-y-1">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {description && <p className="text-xs text-text-tertiary">{description}</p>}
      </div>
      {children}
    </GlassCard>
  );
}
