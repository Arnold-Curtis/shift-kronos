import { createNoteAction } from "@/app/notes/actions";
import { SubmitButton } from "@/components/forms/submit-button";

export function NoteForm() {
  return (
    <form action={createNoteAction} className="glass space-y-3 p-4">
      <h3 className="text-sm font-semibold text-text-primary">New Note</h3>
      <input name="title" placeholder="Title" className="input-field" />
      <textarea name="summary" rows={2} placeholder="Summary (optional)" className="input-field" />
      <textarea name="content" rows={6} placeholder="Content..." className="input-field" />
      <input name="tags" placeholder="Tags (comma-separated)" className="input-field" />
      <SubmitButton
        idleLabel="Save note"
        pendingLabel="Saving..."
        className="btn-primary w-full sm:w-auto"
      />
    </form>
  );
}
