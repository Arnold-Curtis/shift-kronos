import Link from "next/link";
import { StoredFile } from "@prisma/client";
import { deleteStoredFileAction } from "@/app/files/actions";
import { SectionCard } from "@/components/dashboard/section-card";
import { SubmitButton } from "@/components/forms/submit-button";

type FileListProps = {
  files: StoredFile[];
};

function formatState(status: StoredFile["indexingStatus"], error: string | null) {
  if (status === "INDEXED") {
    return "Indexed for retrieval";
  }

  if (status === "FAILED") {
    return error ?? "Indexing failed";
  }

  if (status === "UNSUPPORTED") {
    return error ?? "Retrieval unavailable";
  }

  return "Indexing pending";
}

function formatExtractionState(file: StoredFile) {
  if (file.extractionStatus === "INDEXED") {
    return "Text extracted";
  }

  if (file.extractionStatus === "FAILED") {
    return file.extractionError ?? "Extraction failed";
  }

  if (file.extractionStatus === "UNSUPPORTED") {
    return file.extractionError ?? "Extraction unavailable";
  }

  return "Extraction pending";
}

export function FileList({ files }: FileListProps) {
  return (
    <SectionCard
      title="Stored files"
      description="File records preserve metadata, extraction output, and semantic indexing state rather than hiding processing behind upload alone."
    >
      <div className="space-y-4">
        {files.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-foreground-muted">
            No files uploaded yet.
          </p>
        ) : (
          files.map((file) => (
            <article key={file.id} className="rounded-2xl border border-border bg-black/10 px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">{file.originalFilename}</p>
                  <p className="text-sm text-foreground-muted">{file.contentType} · {file.byteSize} bytes</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-accent">{formatExtractionState(file)}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-accent">{formatState(file.indexingStatus, file.indexingError)}</p>
                </div>

                <Link
                  href={file.blobUrl}
                  target="_blank"
                  className="rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground-muted transition hover:border-white/20 hover:text-foreground"
                >
                  Open file
                </Link>
              </div>

              {file.extractedText ? (
                <div className="mt-4 rounded-2xl border border-border bg-panel px-4 py-3 text-sm leading-6 text-foreground-muted">
                  {file.extractedText.slice(0, 400)}
                  {file.extractedText.length > 400 ? "..." : ""}
                </div>
              ) : null}

              <form action={deleteStoredFileAction} className="mt-4">
                <input type="hidden" name="id" value={file.id} />
                <SubmitButton
                  idleLabel="Delete file"
                  pendingLabel="Deleting file"
                  className="rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground-muted transition hover:border-white/20 hover:text-foreground"
                />
              </form>
            </article>
          ))
        )}
      </div>
    </SectionCard>
  );
}
