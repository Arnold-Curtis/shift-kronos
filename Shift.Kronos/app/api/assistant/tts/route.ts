import { NextResponse } from "next/server";
import path from "path";
import { requireCurrentUser } from "@/lib/current-user";
import { resolveVoiceResponseEnabled, resolveTtsVoice } from "@/lib/ai/preferences";

let ttsClient: InstanceType<typeof import("@google-cloud/text-to-speech").TextToSpeechClient> | null = null;

async function getTtsClient() {
  if (!ttsClient) {
    const { TextToSpeechClient } = await import("@google-cloud/text-to-speech");

    const credentialsPath = path.join(
      process.cwd(),
      "gen-lang-client-0783002568-ad165865b71e.json"
    );

    ttsClient = new TextToSpeechClient({
      keyFilename: credentialsPath,
    });
  }
  return ttsClient;
}

export async function POST(request: Request) {
  const user = await requireCurrentUser();

  const voiceEnabled = resolveVoiceResponseEnabled(user as { voiceResponseEnabled?: boolean } | null);
  if (!voiceEnabled) {
    return NextResponse.json(
      { error: "Voice responses are disabled" },
      { status: 400 }
    );
  }

  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const maxLength = 500;
    const truncatedText = text.slice(0, maxLength);

    const voice = resolveTtsVoice();

    const client = await getTtsClient();

    const [response] = await client.synthesizeSpeech({
      input: { text: truncatedText },
      voice: {
        languageCode: "en-US",
        name: voice,
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 1.0,
        pitch: 0,
      },
    });

    if (!response.audioContent) {
      throw new Error("No audio content returned");
    }

    return new NextResponse(new Uint8Array(response.audioContent as Buffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });

  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: "Text-to-speech failed" },
      { status: 500 }
    );
  }
}
