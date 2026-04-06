import { createNoteAction } from "@/app/notes/actions";
import { SubmitButton } from "@/components/forms/submit-button";

export function NoteForm() {
  return (
    <form action={createNoteAction} className="grid gap-3 rounded-3xl border border-border bg-panel px-5 py-5">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Capture a note</p>
        <p className="text-sm leading-6 text-foreground-muted">
          Notes are first-class records and become searchable through the retrieval index after save.
        </p>
      </div>

      <input
        name="title"
        placeholder="Note title"
        className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-none"
      />
      <textarea
        name="summary"
        rows={2}
        placeholder="Optional summary"
        className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-none"
      />
      <textarea
        name="content"
        rows={8}
        placeholder="Write the note content here"
        className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-none"
      />
      <input
        name="tags"
        placeholder="Tags separated by commas"
        className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-none"
      />
      <SubmitButton
        idleLabel="Save note"
        pendingLabel="Saving note"
        className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 sm:w-auto"
      />
    </form>
  );
}
