import { NoteForm } from "@/components/notes/note-form";
import { NoteList } from "@/components/notes/note-list";
import { requireCurrentUser } from "@/lib/current-user";
import { listNotes } from "@/lib/notes/service";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const user = await requireCurrentUser();
  const notes = await listNotes(user.id);

  return (
    <div className="space-y-4 pb-4">
      <header className="flex items-center gap-3">
        <Link
          href="/me"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition hover:bg-bg-surface-hover hover:text-text-primary"
        >
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">Notes</h1>
          <p className="mt-0.5 text-sm text-text-secondary">Your knowledge base.</p>
        </div>
      </header>

      <NoteForm />
      <NoteList notes={notes} />
    </div>
  );
}
