import { getServerEnv } from "@/lib/env";
import { TRANSCRIPTION_PROVIDER, TranscriptionProvider } from "@/lib/ai/preferences";

export type TranscriptionResult = {
  transcript: string;
};

type AudioInput =
  | {
      kind: "text";
      text: string;
    }
  | {
      kind: "file";
      file: File;
    };

export async function transcribeAudioInput(args: {
  input: AudioInput;
  provider: TranscriptionProvider;
  model: string;
}): Promise<TranscriptionResult> {
  if (args.input.kind === "text") {
    return {
      transcript: args.input.text.trim(),
    };
  }

  if (args.provider !== TRANSCRIPTION_PROVIDER.GROQ) {
    throw new Error(`Unsupported transcription provider: ${args.provider}`);
  }

  const env = getServerEnv();

  if (process.env.VERCEL_ENV === "preview" && !env.GROQ_API_KEY) {
    return {
      transcript: "Preview voice note. Transcription provider is not configured in this preview environment.",
    };
  }

  const body = new FormData();
  body.set("file", args.input.file);
  body.set("model", args.model);
  body.set("response_format", "verbose_json");

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Groq transcription failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    text?: string;
  };

  const transcript = payload.text?.trim();

  if (!transcript) {
    throw new Error("Transcription provider returned empty text.");
  }

  return {
    transcript,
  };
}
