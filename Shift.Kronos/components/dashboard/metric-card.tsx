type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <article className="rounded-3xl border border-border bg-panel px-5 py-5 backdrop-blur">
      <p className="text-sm text-foreground-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-foreground-muted">{detail}</p>
    </article>
  );
}
