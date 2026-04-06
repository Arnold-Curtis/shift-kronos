type ReminderBadgeProps = {
  type: string;
  priority: string;
};

const priorityColors: Record<string, string> = {
  HIGH: "bg-danger-muted text-danger",
  MEDIUM: "bg-warning-muted text-warning",
  LOW: "bg-bg-surface text-text-tertiary",
};

const typeLabels: Record<string, string> = {
  ONE_TIME: "Once",
  RECURRING: "Recurring",
  HABIT: "Habit",
  COUNTDOWN: "Countdown",
  INBOX: "Inbox",
};

export function ReminderBadge({ type, priority }: ReminderBadgeProps) {
  const color = priorityColors[priority] ?? priorityColors.LOW;
  const label = typeLabels[type] ?? type;

  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}>
      {label}
    </span>
  );
}
