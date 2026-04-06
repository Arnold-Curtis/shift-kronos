import { AppShell } from "@/components/layout/app-shell";
import { LoadingCard } from "@/components/feedback/loading-card";

export default function RemindersLoading() {
  return (
    <AppShell
      title="Deterministic reminder management"
      eyebrow="Phase 7"
      description="Loading active reminders, inbox work, and completion history."
      currentPath="/reminders"
    >
      <LoadingCard
        title="Loading reminders"
        description="Reminder collections are being assembled so inbox, scheduled work, countdowns, and completion history stay consistent across the route."
      />
    </AppShell>
  );
}
