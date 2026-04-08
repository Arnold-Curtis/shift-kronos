import Link from "next/link";
import { StoredFile } from "@prisma/client";
import { deleteStoredFileAction } from "@/app/files/actions";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { FolderOpen, ExternalLink, Trash2 } from "lucide-react";

type FileListProps = {
  files: StoredFile[];
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusBadge(status: string) {
  if (status === "INDEXED") return "text-success bg-success-muted";
  if (status === "FAILED") return "text-danger bg-danger-muted";
  if (status === "PENDING") return "text-warning bg-warning-muted";
  return "text-text-tertiary bg-bg-surface";
}

export function FileList({ files }: FileListProps) {
  if (files.length === 0) {
    return (
      <GlassCard>
        <EmptyState icon={FolderOpen} title="No files uploaded" subtitle="Upload a file above to get started." />
      </GlassCard>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <GlassCard key={file.id} variant="interactive">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-muted">
              <FolderOpen size={16} className="text-blue" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-medium text-text-primary">
                {file.originalFilename}
              </h4>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {file.contentType} · {formatSize(file.byteSize)}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusBadge(file.extractionStatus)}`}>
                  {file.extractionStatus === "INDEXED" ? "Extracted" : file.extractionStatus.toLowerCase()}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusBadge(file.indexingStatus)}`}>
                  {file.indexingStatus === "INDEXED" ? "Indexed" : file.indexingStatus.toLowerCase()}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <Link
                href={file.blobUrl}
                target="_blank"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition hover:bg-bg-surface-hover hover:text-text-primary"
              >
                <ExternalLink size={14} />
              </Link>
              <form action={deleteStoredFileAction}>
                <input type="hidden" name="id" value={file.id} />
                <button
                  type="submit"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition hover:bg-danger-muted hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </form>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
