"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/current-user";
import { normalizeAssistantModelForProvider } from "@/lib/ai/preferences";
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

  const normalizedAssistantModel = normalizeAssistantModelForProvider(
    result.data.assistantProvider,
    result.data.assistantModel,
  );

  await updateUserAiSettings(user.id, {
    ...result.data,
    assistantModel: normalizedAssistantModel,
  });

  revalidatePath("/");
  revalidatePath("/chat");
  revalidatePath("/settings");
}
