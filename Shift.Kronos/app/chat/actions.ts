"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/current-user";
import { assistantChatInputSchema, assistantQuickCaptureSchema, assistantVoiceInputSchema } from "@/lib/assistant/schemas";
import { runAssistantWorkflow, runVoiceAssistantWorkflow } from "@/lib/assistant/service";
import { ASSISTANT_INPUT_SOURCE } from "@/lib/assistant/types";

export async function submitChatMessageAction(formData: FormData) {
  const user = await requireCurrentUser();
  const values = assistantChatInputSchema.parse({
    message: String(formData.get("message") ?? ""),
    conversationId: String(formData.get("conversationId") ?? "") || undefined,
  });

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
  const values = assistantQuickCaptureSchema.parse({
    input: String(formData.get("input") ?? ""),
  });

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
  const values = assistantVoiceInputSchema.parse({
    transcript: String(formData.get("transcript") ?? ""),
  });

  await runVoiceAssistantWorkflow(user.id, values.transcript);

  revalidatePath("/");
  revalidatePath("/reminders");
  revalidatePath("/chat");
}
