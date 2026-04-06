import { IndexingStatus, RetrievalSourceType } from "@prisma/client";
import { db } from "@/lib/db";
import { noteDeleteSchema, noteSchema, noteUpdateSchema, NoteInput, NoteUpdateInput } from "@/lib/notes/schemas";
import { clearIndexedContent, markNoteIndexingState, replaceIndexedContent } from "@/lib/retrieval/service";

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function composeNoteIndexContent(input: { title: string; content: string; tags: string[]; summary?: string | null }) {
  const parts = [
    input.title.trim(),
    normalizeOptionalText(input.summary ?? undefined) ?? "",
    input.content.trim(),
    input.tags.length > 0 ? `Tags: ${input.tags.join(", ")}` : "",
  ];

  return parts.filter(Boolean).join("\n\n");
}

async function indexNote(note: { id: string; userId: string; title: string; content: string; tags: string[]; summary: string | null }) {
  await markNoteIndexingState(note.id, IndexingStatus.PENDING, null);

  try {
    const content = composeNoteIndexContent(note);
    await replaceIndexedContent({
      userId: note.userId,
      sourceType: RetrievalSourceType.NOTE,
      sourceId: note.id,
      sourceTitle: note.title,
      content,
    });
    await markNoteIndexingState(note.id, IndexingStatus.INDEXED, null);
  } catch (error) {
    await clearIndexedContent(RetrievalSourceType.NOTE, note.id);
    await markNoteIndexingState(note.id, IndexingStatus.FAILED, error instanceof Error ? error.message : "Note indexing failed.");
    throw error;
  }
}

export async function createNote(userId: string, input: NoteInput) {
  const values = noteSchema.parse(input);
  const note = await db.note.create({
    data: {
      userId,
      title: values.title.trim(),
      content: values.content.trim(),
      tags: values.tags,
      summary: normalizeOptionalText(values.summary),
    },
  });

  await indexNote(note);
  return note;
}

export async function updateNote(userId: string, input: NoteUpdateInput) {
  const values = noteUpdateSchema.parse(input);
  const existing = await db.note.findFirst({
    where: {
      id: values.id,
      userId,
    },
  });

  if (!existing) {
    throw new Error("Note not found.");
  }

  const note = await db.note.update({
    where: {
      id: existing.id,
    },
    data: {
      title: values.title.trim(),
      content: values.content.trim(),
      tags: values.tags,
      summary: normalizeOptionalText(values.summary),
    },
  });

  await indexNote(note);
  return note;
}

export async function deleteNote(userId: string, id: string) {
  const values = noteDeleteSchema.parse({ id });
  const existing = await db.note.findFirst({
    where: {
      id: values.id,
      userId,
    },
  });

  if (!existing) {
    throw new Error("Note not found.");
  }

  await clearIndexedContent(RetrievalSourceType.NOTE, existing.id);

  return db.note.delete({
    where: {
      id: existing.id,
    },
  });
}

export async function listNotes(userId: string) {
  return db.note.findMany({
    where: {
      userId,
    },
    orderBy: [
      {
        updatedAt: "desc",
      },
    ],
  });
}
