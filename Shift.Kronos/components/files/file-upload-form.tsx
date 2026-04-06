import { uploadStoredFileAction } from "@/app/files/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Upload } from "lucide-react";

export function FileUploadForm() {
  return (
    <form action={uploadStoredFileAction} className="glass space-y-3 p-4">
      <div className="flex items-center gap-2.5">
        <Upload size={16} className="text-accent-light" />
        <h3 className="text-sm font-semibold text-text-primary">Upload a file</h3>
      </div>
      <input
        type="file"
        name="file"
        className="input-field text-sm"
      />
      <SubmitButton
        idleLabel="Upload"
        pendingLabel="Uploading..."
        className="btn-primary w-full sm:w-auto"
      />
    </form>
  );
}
