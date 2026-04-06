"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/current-user";
import { assistantChatInputSchema, assistantQuickCaptureSchema, assistantVoiceInputSchema } from "@/lib/assistant/schemas";
import { runAssistantWorkflow, runVoiceAssistantWorkflow } from "@/lib/assistant/service";
import { ASSISTANT_INPUT_SOURCE } from "@/lib/assistant/types";

export async function submitChatMessageAction(formData: FormData) {
  const user = await requireCurrentUser();
  const result = assistantChatInputSchema.safeParse({
    message: String(formData.get("message") ?? ""),
    conversationId: String(formData.get("conversationId") ?? "") || undefined,
  });

  if (!result.success) {
    return;
  }

  const values = result.data;

  await runAssistantWorkflow({
    userId: user.id,
    input: values.message,
    source: ASSISTANT_INPUT_SOURCE.WEB_CHAT,
    conversationId: values.conversationId,
  });

  revalidatePath("/chat");
  revalidatePath("/");
  revalidatePath("/reminders");
}

export async function submitQuickCaptureAction(formData: FormData) {
  const user = await requireCurrentUser();
  const result = assistantQuickCaptureSchema.safeParse({
    input: String(formData.get("input") ?? ""),
  });

  if (!result.success) {
    return;
  }

  const values = result.data;

  await runAssistantWorkflow({
    userId: user.id,
    input: values.input,
    source: ASSISTANT_INPUT_SOURCE.WEB_CAPTURE,
  });

  revalidatePath("/");
  revalidatePath("/reminders");
  revalidatePath("/chat");
}

export async function submitVoiceCaptureAction(formData: FormData) {
  const user = await requireCurrentUser();
  const transcript = String(formData.get("transcript") ?? "");

  const result = assistantVoiceInputSchema.safeParse({
    transcript,
  });

  if (!result.success) {
    return;
  }

  const values = result.data;

  await runVoiceAssistantWorkflow(user.id, {
    transcript: values.transcript,
  });

  revalidatePath("/");
  revalidatePath("/reminders");
  revalidatePath("/chat");
}
