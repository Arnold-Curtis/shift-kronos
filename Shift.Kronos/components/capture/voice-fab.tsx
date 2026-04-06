"use client";

import { useState, useRef, useTransition } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function VoiceFab() {
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isRecording, setIsRecording] = useState(false);
  const [isPending, startTransition] = useTransition();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const { addToast } = useToast();

  async function handlePress() {
    if (isPending) return;

    if (isRecording) {
      stopRecording();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      addToast("error", "Microphone not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });

      recorder.addEventListener("stop", () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const file = new File(
          [blob],
          `voice-note.${blob.type.includes("ogg") ? "ogg" : "webm"}`,
          { type: blob.type || "audio/webm" },
        );

        const formData = new FormData();
        formData.set("audio", file);
        if (conversationId) {
          formData.set("conversationId", conversationId);
        }

        startTransition(async () => {
          try {
            const response = await fetch("/api/assistant/voice", {
              method: "POST",
              body: formData,
            });

            if (!response.ok) {
              addToast("error", "Transcription failed. Check your settings and try again.");
              return;
            }

            const result = (await response.json()) as {
              transcript?: string;
              message?: string;
              conversationId?: string;
            };

            if (result.transcript) {
              if (result.conversationId) {
                setConversationId(result.conversationId);
              }
              addToast(
                "success",
                result.message ?? "Got it! Your voice note has been processed.",
              );
            } else {
              addToast("error", "Couldn't extract text from your recording.");
            }
          } catch {
            addToast("error", "Something went wrong processing your voice note.");
          }
        });
      });

      recorder.start();
      setIsRecording(true);
    } catch {
      addToast("error", "Couldn't access your microphone. Check permissions.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsRecording(false);
  }

  return (
    <button
      type="button"
      onClick={handlePress}
      disabled={isPending}
      aria-label={isRecording ? "Stop recording" : isPending ? "Processing" : "Start voice capture"}
      className="fixed bottom-[calc(var(--tab-bar-height)+var(--safe-area-bottom)+16px)] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-all hover:bg-[#6D28D9] active:scale-95 disabled:opacity-70 lg:bottom-6 lg:right-6"
      style={{
        boxShadow: isRecording
          ? "0 0 0 4px rgba(124, 58, 237, 0.3), 0 0 32px rgba(124, 58, 237, 0.4)"
          : "0 4px 24px rgba(124, 58, 237, 0.3)",
      }}
    >
      {/* Pulse ring while recording */}
      {isRecording && (
        <span className="absolute inset-0 rounded-full bg-accent animate-pulse-ring" />
      )}

      {isPending ? (
        <Loader2 size={22} className="animate-spin" />
      ) : isRecording ? (
        <Square size={18} fill="currentColor" />
      ) : (
        <Mic size={22} />
      )}
    </button>
  );
}
