import { cn } from "@/lib/utils";

type SectionCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
};

export function SectionCard({ title, description, children, className }: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-border bg-panel-strong px-5 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]",
        className,
      )}
    >
      <div className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm leading-6 text-foreground-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}
