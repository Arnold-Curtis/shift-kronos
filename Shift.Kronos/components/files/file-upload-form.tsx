import { uploadStoredFileAction } from "@/app/files/actions";
import { SubmitButton } from "@/components/forms/submit-button";

export function FileUploadForm() {
  return (
    <form action={uploadStoredFileAction} className="grid gap-3 rounded-3xl border border-border bg-panel px-5 py-5">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Upload a file</p>
        <p className="text-sm leading-6 text-foreground-muted">
          Uploaded files keep blob-backed storage, extraction state, and semantic indexing state visible.
        </p>
      </div>

      <input
        type="file"
        name="file"
        className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-none"
      />

      <SubmitButton
        idleLabel="Upload file"
        pendingLabel="Uploading file"
        className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 sm:w-auto"
      />
    </form>
  );
}
