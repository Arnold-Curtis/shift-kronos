import { AppShell } from "@/components/layout/app-shell";
import { LoadingCard } from "@/components/feedback/loading-card";

export default function SettingsLoading() {
  return (
    <AppShell
      title="Operational controls and personal backups"
      eyebrow="Phase 7"
      description="Loading account state and export controls."
      currentPath="/settings"
    >
      <LoadingCard
        title="Loading settings"
        description="Profile, delivery, and export information is being assembled before the operational surface renders."
      />
    </AppShell>
  );
}
