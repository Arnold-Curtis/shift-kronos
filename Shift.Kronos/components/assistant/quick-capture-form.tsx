"use client";

import { useState, useTransition } from "react";
import { submitQuickCaptureAction, submitVoiceCaptureAction } from "@/app/chat/actions";
import { SubmitButton } from "@/components/forms/submit-button";

export function QuickCaptureForm() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioStatus, setAudioStatus] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isPending, startTransition] = useTransition();
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setAudioStatus("Microphone recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      const chunks: BlobPart[] = [];
      setStream(stream);
      setRecorder(recorder);

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const file = new File([blob], `voice-note.${blob.type.includes("ogg") ? "ogg" : "webm"}`, {
          type: blob.type || "audio/webm",
        });

        const formData = new FormData();
        formData.set("audio", file);

        startTransition(async () => {
          try {
            const response = await fetch("/api/assistant/voice", {
              method: "POST",
              body: formData,
            });

            if (!response.ok) {
              setAudioStatus("Audio transcription failed. Check the transcription provider settings and retry.");
              return;
            }

            const result = (await response.json()) as { transcript?: string };

            if (result.transcript) {
              setTranscript(result.transcript);
              setAudioStatus("Audio transcribed and sent through the assistant workflow.");
            } else {
              setAudioStatus("Audio capture finished, but transcription did not return text.");
            }
          } catch {
            setAudioStatus("Audio transcription failed. Check the transcription provider settings and retry.");
          }
        });
      });

      recorder.start();
      setIsRecording(true);
      setAudioStatus("Recording in progress. Stop recording to upload and transcribe.");
    } catch {
      setAudioStatus("Microphone access failed. Check browser microphone permissions and retry.");
    }
  }

  function stopRecording() {
    recorder?.stop();
    setRecorder(null);
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setIsRecording(false);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <form action={submitQuickCaptureAction} className="grid gap-3 rounded-3xl border border-border bg-panel px-5 py-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Natural-language quick capture</p>
          <p className="text-sm leading-6 text-foreground-muted">
            Type naturally to create reminders through the same validated server-side reminder pipeline used everywhere else in the product.
          </p>
        </div>

        <textarea
          name="input"
          rows={4}
          required
          placeholder="Remind me to submit the assignment tomorrow at 8pm"
          className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none"
        />

        <SubmitButton
          idleLabel="Capture with assistant"
          pendingLabel="Capturing"
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 sm:w-auto"
        />
      </form>

      <div className="grid gap-3 rounded-3xl border border-border bg-panel px-5 py-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Voice-to-action path</p>
          <p className="text-sm leading-6 text-foreground-muted">
            Record from your microphone or submit a transcript manually. Recorded audio is uploaded for provider-backed transcription before entering the assistant workflow.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isPending}
            className="rounded-2xl border border-border bg-black/10 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRecording ? "Stop recording" : "Start microphone recording"}
          </button>
        </div>

        {audioStatus ? (
          <p className="rounded-2xl border border-border bg-black/10 px-4 py-3 text-sm leading-6 text-foreground-muted">
            {audioStatus}
          </p>
        ) : null}

        <form action={submitVoiceCaptureAction} className="grid gap-3">
          <textarea
            name="transcript"
            rows={4}
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            placeholder="Manual transcript fallback: remind me to revise operating systems tonight"
            className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none"
          />

          <SubmitButton
            idleLabel="Run transcript workflow"
            pendingLabel="Running transcript workflow"
            className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-white/5 sm:w-auto"
          />
        </form>
      </div>
    </div>
  );
}
