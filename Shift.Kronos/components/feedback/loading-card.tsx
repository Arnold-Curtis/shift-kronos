type LoadingCardProps = {
  title: string;
  description: string;
};

export function LoadingCard({ title, description }: LoadingCardProps) {
  return (
    <section className="rounded-3xl border border-border bg-panel-strong px-5 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
      <div className="animate-pulse space-y-4">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded-full bg-white/10" />
          <div className="h-7 w-56 rounded-full bg-white/10" />
          <div className="h-4 w-full max-w-xl rounded-full bg-white/10" />
        </div>
        <div className="rounded-2xl border border-border bg-black/10 px-4 py-4">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">{description}</p>
        </div>
      </div>
    </section>
  );
}
