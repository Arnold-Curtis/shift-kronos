"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/current-user";
import { INITIAL_ME_ACTION_STATE, MeActionState } from "@/app/me/action-state";
import { normalizeAssistantModelForProvider } from "@/lib/ai/preferences";
import { dispatchNotificationDiagnostics, sendEmailTestMessage } from "@/lib/notifications/diagnostics";
import { updateUserAiSettings } from "@/lib/settings/service";
import { userAiSettingsSchema } from "@/lib/settings/schemas";

export async function updateUserAiSettingsAction(formData: FormData) {
  const user = await requireCurrentUser();

  const result = userAiSettingsSchema.safeParse({
    assistantProvider: String(formData.get("assistantProvider") ?? ""),
    assistantModel: String(formData.get("assistantModel") ?? ""),
    transcriptionProvider: String(formData.get("transcriptionProvider") ?? ""),
    transcriptionModel: String(formData.get("transcriptionModel") ?? ""),
    voiceResponseEnabled: formData.get("voiceResponseEnabled") === "on",
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

export async function sendEmailTestMessageAction(
  _previousState: MeActionState = INITIAL_ME_ACTION_STATE,
): Promise<MeActionState> {
  void _previousState;

  try {
    const user = await requireCurrentUser();
    const result = await sendEmailTestMessage(user.id);

    revalidatePath("/me");

    return {
      status: result.ok ? "success" : "error",
      message: result.message,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Email test failed.",
    };
  }
}

export async function dispatchNotificationsAction(
  _previousState: MeActionState = INITIAL_ME_ACTION_STATE,
): Promise<MeActionState> {
  void _previousState;

  try {
    const user = await requireCurrentUser();
    const result = await dispatchNotificationDiagnostics(user.id);

    revalidatePath("/me");

    return {
      status: result.ok ? "success" : "error",
      message: result.message,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Notification dispatch failed.",
    };
  }
}
