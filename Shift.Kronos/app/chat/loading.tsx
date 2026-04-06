import { AppShell } from "@/components/layout/app-shell";
import { LoadingCard } from "@/components/feedback/loading-card";

export default function ChatLoading() {
  return (
    <AppShell
      title="Grounded assistant interaction"
      eyebrow="Phase 7"
      description="Loading the latest conversation continuity, assistant context, and recent interactions."
      currentPath="/chat"
    >
      <LoadingCard
        title="Loading conversations"
        description="Recent turns and cross-session continuity are being assembled before the chat workspace renders."
      />
    </AppShell>
  );
}
