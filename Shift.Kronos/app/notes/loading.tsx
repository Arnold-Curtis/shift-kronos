import { AppShell } from "@/components/layout/app-shell";
import { LoadingCard } from "@/components/feedback/loading-card";

export default function NotesLoading() {
  return (
    <AppShell
      title="Retrieval-backed notes"
      eyebrow="Phase 7"
      description="Loading note records and current indexing state."
      currentPath="/notes"
    >
      <LoadingCard
        title="Loading notes"
        description="Stored notes and their indexing status are being prepared before the management surface renders."
      />
    </AppShell>
  );
}
