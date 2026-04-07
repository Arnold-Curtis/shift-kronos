"use client";

import { useState } from "react";
import { Mic } from "lucide-react";
import { VoiceModal } from "./voice-modal";
import { useToast } from "@/components/ui/toast";

type VoiceFabProps = {
  voiceResponseEnabled: boolean;
};

export function VoiceFab({ voiceResponseEnabled }: VoiceFabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (transcript: string) => {
    addToast("success", `Heard: "${transcript.slice(0, 50)}${transcript.length > 50 ? "..." : ""}"`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        aria-label="Open voice assistant"
        className="fixed bottom-[calc(var(--tab-bar-height)+var(--safe-area-bottom)+16px)] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-all hover:bg-[#6D28D9] active:scale-95 lg:bottom-6 lg:right-6"
        style={{
          boxShadow: "0 4px 24px rgba(124, 58, 237, 0.3)",
        }}
      >
        <Mic size={22} />
      </button>

      <VoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        voiceResponseEnabled={voiceResponseEnabled}
      />
    </>
  );
}
