import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { runVoiceAssistantWorkflow } from "@/lib/assistant/service";
import { logError, logInfo, logWarn } from "@/lib/observability/logger";

export async function POST(request: Request) {
  const user = await requireCurrentUser();

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");
    const conversationId = String(formData.get("conversationId") ?? "") || undefined;

    if (!(audioFile instanceof File) || audioFile.size === 0) {
      logWarn("assistant.voice.invalid-audio", {
        userId: user.id,
      });

      return NextResponse.json({ error: "A recorded audio file is required." }, { status: 400 });
    }

    const result = await runVoiceAssistantWorkflow(user.id, {
      audioFile,
      conversationId,
    });

    logInfo("assistant.voice.transcribed", {
      userId: user.id,
      transcriptLength: result.transcript.length,
    });

    return NextResponse.json({
      transcript: result.transcript,
      message: result.result.message,
      kind: result.result.kind,
      conversationId: result.result.conversationId,
      transcriptionAvailable: result.transcript.trim().length > 0,
    });
  } catch (error) {
    logError("assistant.voice.failed", {
      userId: user.id,
      error,
    });

    return NextResponse.json({ error: "Voice transcription failed." }, { status: 500 });
  }
}
