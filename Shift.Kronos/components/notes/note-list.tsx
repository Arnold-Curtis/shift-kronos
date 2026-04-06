import { deleteNoteAction, updateNoteAction } from "@/app/notes/actions";
import { SectionCard } from "@/components/dashboard/section-card";
import { SubmitButton } from "@/components/forms/submit-button";
import { Note } from "@prisma/client";

type NoteListProps = {
  notes: Note[];
};

function formatIndexState(note: Note) {
  if (note.indexingStatus === "INDEXED") {
    return "Indexed for retrieval";
  }

  if (note.indexingStatus === "FAILED") {
    return note.indexingError ?? "Indexing failed";
  }

  if (note.indexingStatus === "PENDING") {
    return "Indexing pending";
  }

  return "Indexing unavailable";
}

export function NoteList({ notes }: NoteListProps) {
  return (
    <SectionCard
      title="Stored notes"
      description="Each saved note remains directly manageable in the app while also feeding the semantic retrieval layer."
    >
      <div className="space-y-4">
        {notes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-foreground-muted">
            No notes yet. Create one above to start building retrieval-backed knowledge.
          </p>
        ) : (
          notes.map((note) => (
            <article key={note.id} className="rounded-2xl border border-border bg-black/10 px-4 py-4">
              <form action={updateNoteAction} className="grid gap-3">
                <input type="hidden" name="id" value={note.id} />
                <input
                  name="title"
                  defaultValue={note.title}
                  className="w-full rounded-2xl border border-border bg-panel px-4 py-3 text-sm text-foreground outline-none"
                />
                <textarea
                  name="summary"
                  rows={2}
                  defaultValue={note.summary ?? ""}
                  className="w-full rounded-2xl border border-border bg-panel px-4 py-3 text-sm text-foreground outline-none"
                />
                <textarea
                  name="content"
                  rows={7}
                  defaultValue={note.content}
                  className="w-full rounded-2xl border border-border bg-panel px-4 py-3 text-sm text-foreground outline-none"
                />
                <input
                  name="tags"
                  defaultValue={note.tags.join(", ")}
                  className="w-full rounded-2xl border border-border bg-panel px-4 py-3 text-sm text-foreground outline-none"
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs uppercase tracking-[0.18em] text-accent">{formatIndexState(note)}</p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <SubmitButton
                      idleLabel="Update note"
                      pendingLabel="Updating note"
                      className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
                    />
                  </div>
                </div>
              </form>

              <form action={deleteNoteAction} className="mt-3">
                <input type="hidden" name="id" value={note.id} />
                <SubmitButton
                  idleLabel="Delete note"
                  pendingLabel="Deleting note"
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
