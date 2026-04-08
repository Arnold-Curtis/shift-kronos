import { User } from "@prisma/client";

export const ASSISTANT_PROVIDER = {
  OPENROUTER: "openrouter",
} as const;

export const TRANSCRIPTION_PROVIDER = {
  GROQ: "groq",
} as const;

export const TTS_PROVIDER = {
  GOOGLE_CLOUD: "google_cloud",
} as const;

export const TTS_VOICE_OPTIONS = {
  [TTS_PROVIDER.GOOGLE_CLOUD]: {
    defaultVoice: "en-US-Neural2-F",
    availableVoices: [
      { id: "en-US-Neural2-F", label: "Female (Neural)", gender: "female" },
      { id: "en-US-Neural2-D", label: "Male (Neural)", gender: "male" },
      { id: "en-US-Neural2-C", label: "Female Alt (Neural)", gender: "female" },
    ],
    audioEncoding: "MP3",
    speakingRate: 1.0,
    pitch: 0,
  },
} as const;

export const DEFAULT_ASSISTANT_MODEL_BY_PROVIDER = {
  [ASSISTANT_PROVIDER.OPENROUTER]: "qwen/qwen3-next-80b-a3b-instruct",
} as const;

export const DEFAULT_TRANSCRIPTION_MODEL_BY_PROVIDER = {
  [TRANSCRIPTION_PROVIDER.GROQ]: "whisper-large-v3",
} as const;

export type AssistantProvider = (typeof ASSISTANT_PROVIDER)[keyof typeof ASSISTANT_PROVIDER];
export type TranscriptionProvider = (typeof TRANSCRIPTION_PROVIDER)[keyof typeof TRANSCRIPTION_PROVIDER];
export type TtsProvider = (typeof TTS_PROVIDER)[keyof typeof TTS_PROVIDER];

function normalizeAssistantModelValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function isLikelyOpenRouterModel(value: string | null | undefined) {
  const model = normalizeAssistantModelValue(value);

  if (!model) {
    return false;
  }

  return model.includes("/");
}

export function normalizeAssistantModelForProvider(provider: AssistantProvider, value: string | null | undefined) {
  const model = normalizeAssistantModelValue(value);

  if (!model) {
    return DEFAULT_ASSISTANT_MODEL_BY_PROVIDER[provider];
  }

  if (provider === ASSISTANT_PROVIDER.OPENROUTER && !isLikelyOpenRouterModel(model)) {
    return DEFAULT_ASSISTANT_MODEL_BY_PROVIDER[provider];
  }

  return model;
}

export function isAssistantProvider(value: string | null | undefined): value is AssistantProvider {
  return value === ASSISTANT_PROVIDER.OPENROUTER;
}

export function isTranscriptionProvider(value: string | null | undefined): value is TranscriptionProvider {
  return value === TRANSCRIPTION_PROVIDER.GROQ;
}

export function resolveAssistantProvider(user: Pick<User, "assistantProvider"> | null | undefined): AssistantProvider {
  return isAssistantProvider(user?.assistantProvider) ? user.assistantProvider : ASSISTANT_PROVIDER.OPENROUTER;
}

export function resolveAssistantModel(user: Pick<User, "assistantProvider" | "assistantModel"> | null | undefined) {
  const provider = resolveAssistantProvider(user);
  return normalizeAssistantModelForProvider(provider, user?.assistantModel);
}

export function resolveTranscriptionProvider(user: Pick<User, "transcriptionProvider"> | null | undefined): TranscriptionProvider {
  return isTranscriptionProvider(user?.transcriptionProvider)
    ? user.transcriptionProvider
    : TRANSCRIPTION_PROVIDER.GROQ;
}

export function resolveTranscriptionModel(
  user: Pick<User, "transcriptionProvider" | "transcriptionModel"> | null | undefined,
) {
  const provider = resolveTranscriptionProvider(user);
  const model = user?.transcriptionModel?.trim();
  return model || DEFAULT_TRANSCRIPTION_MODEL_BY_PROVIDER[provider];
}

export function getAssistantProviderOptions() {
  return [
    {
      value: ASSISTANT_PROVIDER.OPENROUTER,
      label: "OpenRouter",
      description: "Use OpenRouter as the assistant backend and choose the chat model you want to run.",
      defaultModel: DEFAULT_ASSISTANT_MODEL_BY_PROVIDER[ASSISTANT_PROVIDER.OPENROUTER],
      suggestedModels: [
        "qwen/qwen3-next-80b-a3b-instruct",
        "qwen/qwen-plus-2025-07-28",
        "qwen/qwen3-max",
        "qwen/qwen3-30b-a3b-instruct-2507",
        "qwen/qwen3-next-80b-a3b-instruct:free",
      ],
    },
  ];
}

export function getTranscriptionProviderOptions() {
  return [
    {
      value: TRANSCRIPTION_PROVIDER.GROQ,
      label: "Groq Whisper",
      description: "Upload recorded audio and transcribe it through Groq speech-to-text.",
      defaultModel: DEFAULT_TRANSCRIPTION_MODEL_BY_PROVIDER[TRANSCRIPTION_PROVIDER.GROQ],
      suggestedModels: ["whisper-large-v3", "whisper-large-v3-turbo"],
    },
  ];
}

export function resolveTtsProvider(): TtsProvider {
  return TTS_PROVIDER.GOOGLE_CLOUD;
}

export function resolveTtsVoice(): string {
  return TTS_VOICE_OPTIONS[TTS_PROVIDER.GOOGLE_CLOUD].defaultVoice;
}

export function resolveVoiceResponseEnabled(user: { voiceResponseEnabled?: boolean } | null): boolean {
  return user?.voiceResponseEnabled ?? true;
}

export function getTtsVoiceOptions() {
  return TTS_VOICE_OPTIONS[TTS_PROVIDER.GOOGLE_CLOUD].availableVoices;
}
