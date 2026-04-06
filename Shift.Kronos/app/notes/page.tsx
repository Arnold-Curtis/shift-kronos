import { AppShell } from "@/components/layout/app-shell";
import { NoteForm } from "@/components/notes/note-form";
import { NoteList } from "@/components/notes/note-list";
import { requireCurrentUser } from "@/lib/current-user";
import { listNotes } from "@/lib/notes/service";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const user = await requireCurrentUser();
  const notes = await listNotes(user.id);

  return (
    <AppShell
      title="Retrieval-backed notes"
      eyebrow="Phase 7"
      description="Notes remain first-class knowledge records with deterministic storage and retrieval indexing, now presented through a more resilient day-to-day management surface."
      currentPath="/notes"
    >
      <div className="space-y-4">
        <NoteForm />
        <NoteList notes={notes} />
      </div>
    </AppShell>
  );
}
