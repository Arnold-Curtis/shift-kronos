import { getServerEnv } from "@/lib/env";
import { TRANSCRIPTION_PROVIDER, TranscriptionProvider } from "@/lib/ai/preferences";

export type TranscriptionResult = {
  transcript: string;
  available: boolean;
  message?: string;
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
      available: true,
    };
  }

  if (args.provider !== TRANSCRIPTION_PROVIDER.GROQ) {
    throw new Error(`Unsupported transcription provider: ${args.provider}`);
  }

  const env = getServerEnv();
  const isPreview = process.env.VERCEL_ENV === "preview";

  if (isPreview && !env.GROQ_API_KEY) {
    return {
      transcript: "",
      available: false,
      message: "Automatic transcription is not configured in this preview environment yet.",
    };
  }

  const body = new FormData();
  body.set("file", args.input.file);
  body.set("model", args.model);
  body.set("response_format", "verbose_json");

  try {
    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");

      if (isPreview) {
        return {
          transcript: "",
          available: false,
          message: "Automatic transcription is currently unavailable in this preview environment.",
        };
      }

      throw new Error(`Groq transcription failed with status ${response.status}: ${errorBody.slice(0, 300)}`);
    }

    const payload = (await response.json()) as {
      text?: string;
    };

    const transcript = payload.text?.trim();

    if (!transcript) {
      if (isPreview) {
        return {
          transcript: "",
          available: false,
          message: "The voice note was received, but no transcript was returned in this preview environment.",
        };
      }

      throw new Error("Transcription provider returned empty text.");
    }

    return {
      transcript,
      available: true,
    };
  } catch (error) {
    if (isPreview) {
      return {
        transcript: "",
        available: false,
        message: "The voice note was received, but transcription failed in this preview environment. Please use text chat for now.",
      };
    }

    throw error;
  }
}
