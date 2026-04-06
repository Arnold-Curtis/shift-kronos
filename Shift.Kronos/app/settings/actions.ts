"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/current-user";
import { updateUserAiSettings } from "@/lib/settings/service";
import { userAiSettingsSchema } from "@/lib/settings/schemas";

export async function updateUserAiSettingsAction(formData: FormData) {
  const user = await requireCurrentUser();

  const result = userAiSettingsSchema.safeParse({
    assistantProvider: String(formData.get("assistantProvider") ?? ""),
    assistantModel: String(formData.get("assistantModel") ?? ""),
    transcriptionProvider: String(formData.get("transcriptionProvider") ?? ""),
    transcriptionModel: String(formData.get("transcriptionModel") ?? ""),
  });

  if (!result.success) {
    return;
  }

  await updateUserAiSettings(user.id, result.data);

  revalidatePath("/");
  revalidatePath("/chat");
  revalidatePath("/settings");
}
