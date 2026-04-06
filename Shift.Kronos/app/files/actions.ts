"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/current-user";
import { createStoredFile, deleteStoredFile } from "@/lib/files/service";

export async function uploadStoredFileAction(formData: FormData) {
  const user = await requireCurrentUser();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("A file upload is required.");
  }

  await createStoredFile(user.id, file);

  revalidatePath("/files");
  revalidatePath("/chat");
}

export async function deleteStoredFileAction(formData: FormData) {
  const user = await requireCurrentUser();

  await deleteStoredFile(user.id, String(formData.get("id") ?? ""));

  revalidatePath("/files");
  revalidatePath("/chat");
}
