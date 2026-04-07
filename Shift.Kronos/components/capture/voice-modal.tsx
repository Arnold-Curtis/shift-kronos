"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, X, Loader2, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transcript: string) => Promise<void>;
  voiceResponseEnabled?: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export function VoiceModal({
  isOpen,
  onClose,
  onSubmit,
  voiceResponseEnabled = true,
}: VoiceModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      streamRef.current?.getTracks().forEach((track) => track.stop());
    }
  }, [isRecording]);

  const visualizeAudio = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, "rgba(124, 58, 237, 0.8)");
        gradient.addColorStop(1, "rgba(124, 58, 237, 0.3)");

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  }, []);

  const speakResponse = useCallback(async (text: string) => {
    try {
      setIsSpeaking(true);

      const response = await fetch("/api/assistant/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Voice response playback failed.");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Voice response playback failed.");
      console.error("TTS failed:", error);
      setIsSpeaking(false);
    }
  }, []);

  const processRecording = useCallback(async (blob: Blob) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("audio", blob);
      if (conversationId) {
        formData.append("conversationId", conversationId);
      }

      const response = await fetch("/api/assistant/voice", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({ error: "Voice processing failed." }));
        throw new Error(typeof errorPayload.error === "string" ? errorPayload.error : "Voice processing failed.");
      }

      const result = await response.json();

      if (result.transcript) {
        await onSubmit(result.transcript);

        const userMessage: Message = {
          id: Date.now().toString(),
          role: "user",
          content: result.transcript,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.message || "Processed your request.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        if (typeof result.conversationId === "string" && result.conversationId) {
          setConversationId(result.conversationId);
        }

        if (voiceResponseEnabled && result.message) {
          await speakResponse(result.message);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Processing failed.";
      setErrorMessage(message);
      console.error("Processing failed:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [conversationId, onSubmit, speakResponse, voiceResponseEnabled]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      visualizeAudio();

      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }

        if (audioContextRef.current) {
          await audioContextRef.current.close();
        }

        const blob = new Blob(chunks, { type: "audio/webm" });
        await processRecording(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  }, [processRecording, visualizeAudio]);

  const handleButtonPress = useCallback(() => {
    if (isProcessing || isSpeaking) return;

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, isProcessing, isSpeaking, startRecording, stopRecording]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md mb-safe-area-bottom bg-surface-elevated rounded-t-3xl shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                isRecording ? "bg-red-500 animate-pulse" : "bg-green-500"
              )}
            />
            <span className="text-sm font-medium text-text-secondary">
              {isRecording ? "Listening..." : isProcessing ? "Processing..." : "Ready"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-hover transition-colors"
          >
            <X size={20} className="text-text-secondary" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-4 space-y-4">
          {errorMessage ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </div>
          ) : null}

          {messages.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary">
              <p className="text-sm">
                {isRecording ? "Speak now..." : "Hold the button below to speak"}
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2",
                    message.role === "user"
                      ? "bg-accent text-white"
                      : "bg-surface-muted text-text-primary"
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {isRecording && (
          <div className="px-6 py-2">
            <canvas
              ref={canvasRef}
              width={300}
              height={60}
              className="w-full h-16 rounded-lg"
            />
          </div>
        )}

        <div className="flex justify-center py-6">
          <button
            onClick={handleButtonPress}
            disabled={isProcessing}
            className={cn(
              "relative w-20 h-20 rounded-full flex items-center justify-center transition-all",
              "bg-accent text-white shadow-lg",
              isRecording && "bg-red-500 scale-110",
              isProcessing && "opacity-70"
            )}
          >
            {isProcessing ? (
              <Loader2 size={28} className="animate-spin" />
            ) : isRecording ? (
              <MicOff size={28} />
            ) : (
              <Mic size={28} />
            )}

            {isRecording && (
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
            )}
          </button>
        </div>

        {isSpeaking && (
          <div className="flex items-center justify-center gap-2 py-2 text-text-secondary">
            <Volume2 size={16} className="animate-pulse" />
            <span className="text-xs">Speaking...</span>
          </div>
        )}
      </div>
    </div>
  );
}
