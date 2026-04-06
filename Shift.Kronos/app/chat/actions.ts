"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/current-user";
import { assistantChatInputSchema, assistantQuickCaptureSchema, assistantVoiceInputSchema } from "@/lib/assistant/schemas";
import { runAssistantWorkflow, runVoiceAssistantWorkflow } from "@/lib/assistant/service";
import { ASSISTANT_INPUT_SOURCE } from "@/lib/assistant/types";
import { AssistantActionState } from "@/app/chat/action-state";

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

  const workflowResult = await runAssistantWorkflow({
    userId: user.id,
    input: values.message,
    source: ASSISTANT_INPUT_SOURCE.WEB_CHAT,
    conversationId: values.conversationId,
  });

  revalidatePath("/chat");
  revalidatePath("/");
  revalidatePath("/reminders");

  redirect(`/chat?conversationId=${workflowResult.conversationId ?? values.conversationId ?? ""}`);
}

export async function submitQuickCaptureAction(
  _previousState: AssistantActionState,
  formData: FormData,
): Promise<AssistantActionState> {
  const user = await requireCurrentUser();
  const result = assistantQuickCaptureSchema.safeParse({
    input: String(formData.get("input") ?? ""),
  });

  if (!result.success) {
    return {
      status: "error",
      message: "Enter a valid quick-capture request before sending it to the assistant.",
    };
  }

  const values = result.data;

  const workflowResult = await runAssistantWorkflow({
    userId: user.id,
    input: values.input,
    source: ASSISTANT_INPUT_SOURCE.WEB_CAPTURE,
  });

  revalidatePath("/");
  revalidatePath("/reminders");
  revalidatePath("/chat");

  return {
    status: "success",
    kind: workflowResult.kind,
    message: workflowResult.message,
    conversationId: workflowResult.conversationId,
  };
}

export async function submitVoiceCaptureAction(
  _previousState: AssistantActionState,
  formData: FormData,
): Promise<AssistantActionState> {
  const user = await requireCurrentUser();
  const transcript = String(formData.get("transcript") ?? "");

  const result = assistantVoiceInputSchema.safeParse({
    transcript,
  });

  if (!result.success) {
    return {
      status: "error",
      message: "Provide a transcript before running the voice assistant workflow.",
    };
  }

  const values = result.data;

  const workflowResult = await runVoiceAssistantWorkflow(user.id, {
    transcript: values.transcript,
  });

  revalidatePath("/");
  revalidatePath("/reminders");
  revalidatePath("/chat");

  return {
    status: "success",
    kind: workflowResult.result.kind,
    message: workflowResult.result.message,
    conversationId: workflowResult.result.conversationId,
  };
}
