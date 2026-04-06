import { ReminderPriority, ReminderType } from "@prisma/client";
import { cn } from "@/lib/utils";

type ReminderBadgeProps = {
  type?: ReminderType;
  priority?: ReminderPriority;
  label?: string;
};

export function ReminderBadge({ type, priority, label }: ReminderBadgeProps) {
  const tone = priority === "HIGH" ? "border-danger/40 text-danger" : priority === "LOW" ? "border-border text-foreground-muted" : "border-accent/30 text-accent";

  return (
    <span className={cn("rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", tone)}>
      {label ?? type?.replaceAll("_", " ")}
    </span>
  );
}
