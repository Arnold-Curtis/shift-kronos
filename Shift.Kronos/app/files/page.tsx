import { AppShell } from "@/components/layout/app-shell";
import { FileList } from "@/components/files/file-list";
import { FileUploadForm } from "@/components/files/file-upload-form";
import { requireCurrentUser } from "@/lib/current-user";
import { listStoredFiles } from "@/lib/files/service";

export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const user = await requireCurrentUser();
  const files = await listStoredFiles(user.id);

  return (
    <AppShell
      title="Blob-backed file knowledge"
      eyebrow="Phase 7"
      description="Files keep relational metadata, extraction state, and retrieval indexing so stored documents participate in grounded assistant answers while remaining operationally visible and manageable."
      currentPath="/files"
    >
      <div className="space-y-4">
        <FileUploadForm />
        <FileList files={files} />
      </div>
    </AppShell>
  );
}
