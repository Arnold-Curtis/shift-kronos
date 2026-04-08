import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
};

export function EmptyState({ icon: Icon = Inbox, title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-muted">
        <Icon size={24} className="text-accent-light" />
      </div>
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {subtitle ? (
        <p className="mt-1.5 max-w-[260px] text-xs leading-5 text-text-tertiary">{subtitle}</p>
      ) : null}
    </div>
  );
}
