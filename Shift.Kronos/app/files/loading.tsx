import { AppShell } from "@/components/layout/app-shell";
import { LoadingCard } from "@/components/feedback/loading-card";

export default function FilesLoading() {
  return (
    <AppShell
      title="Blob-backed file knowledge"
      eyebrow="Phase 7"
      description="Loading uploaded files, extraction state, and retrieval indexing state."
      currentPath="/files"
    >
      <LoadingCard
        title="Loading files"
        description="Stored file metadata and processing state are being assembled before the route becomes interactive."
      />
    </AppShell>
  );
}
