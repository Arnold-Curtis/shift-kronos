import { deleteNoteAction, updateNoteAction } from "@/app/notes/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Note } from "@prisma/client";
import { FileText, Trash2 } from "lucide-react";

type NoteListProps = {
  notes: Note[];
};

function formatIndexState(note: Note) {
  if (note.indexingStatus === "INDEXED") return "Indexed";
  if (note.indexingStatus === "FAILED") return "Index failed";
  if (note.indexingStatus === "PENDING") return "Pending";
  return "N/A";
}

export function NoteList({ notes }: NoteListProps) {
  if (notes.length === 0) {
    return (
      <GlassCard>
        <EmptyState icon={FileText} title="No notes yet" subtitle="Create one above to get started." />
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <GlassCard key={note.id} variant="interactive">
          <form action={updateNoteAction} className="space-y-3">
            <input type="hidden" name="id" value={note.id} />
            <input name="title" defaultValue={note.title} className="input-field text-sm font-semibold" />
            <textarea name="summary" rows={2} defaultValue={note.summary ?? ""} className="input-field text-sm" />
            <textarea name="content" rows={5} defaultValue={note.content} className="input-field text-sm" />
            <input name="tags" defaultValue={note.tags.join(", ")} className="input-field text-sm" />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-medium uppercase tracking-widest text-text-tertiary">
                {formatIndexState(note)}
              </span>
              <div className="flex gap-2">
                <SubmitButton
                  idleLabel="Update"
                  pendingLabel="Saving..."
                  className="btn-primary text-xs py-2 px-3"
                />
              </div>
            </div>
          </form>
          <form action={deleteNoteAction} className="mt-2">
            <input type="hidden" name="id" value={note.id} />
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-text-tertiary transition hover:bg-danger-muted hover:text-danger"
            >
              <Trash2 size={12} />
              Delete
            </button>
          </form>
        </GlassCard>
      ))}
    </div>
  );
}
