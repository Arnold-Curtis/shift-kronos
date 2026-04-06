"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/current-user";
import { createNote, deleteNote, updateNote } from "@/lib/notes/service";

function parseTags(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function createNoteAction(formData: FormData) {
  const user = await requireCurrentUser();

  await createNote(user.id, {
    title: String(formData.get("title") ?? ""),
    content: String(formData.get("content") ?? ""),
    tags: parseTags(formData.get("tags")),
    summary: String(formData.get("summary") ?? ""),
  });

  revalidatePath("/notes");
  revalidatePath("/chat");
}

export async function updateNoteAction(formData: FormData) {
  const user = await requireCurrentUser();

  await updateNote(user.id, {
    id: String(formData.get("id") ?? ""),
    title: String(formData.get("title") ?? ""),
    content: String(formData.get("content") ?? ""),
    tags: parseTags(formData.get("tags")),
    summary: String(formData.get("summary") ?? ""),
  });

  revalidatePath("/notes");
  revalidatePath("/chat");
}

export async function deleteNoteAction(formData: FormData) {
  const user = await requireCurrentUser();

  await deleteNote(user.id, String(formData.get("id") ?? ""));

  revalidatePath("/notes");
  revalidatePath("/chat");
}
