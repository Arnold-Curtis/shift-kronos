import { User } from "@prisma/client";

export const ASSISTANT_PROVIDER = {
  GROQ: "groq",
  GITHUB_MODELS: "github-models",
} as const;

export const TRANSCRIPTION_PROVIDER = {
  GROQ: "groq",
} as const;

export const DEFAULT_ASSISTANT_MODEL_BY_PROVIDER = {
  [ASSISTANT_PROVIDER.GROQ]: "llama-3.3-70b-versatile",
  [ASSISTANT_PROVIDER.GITHUB_MODELS]: "gpt-4o-mini",
} as const;

export const DEFAULT_TRANSCRIPTION_MODEL_BY_PROVIDER = {
  [TRANSCRIPTION_PROVIDER.GROQ]: "whisper-large-v3",
} as const;

export type AssistantProvider = (typeof ASSISTANT_PROVIDER)[keyof typeof ASSISTANT_PROVIDER];
export type TranscriptionProvider = (typeof TRANSCRIPTION_PROVIDER)[keyof typeof TRANSCRIPTION_PROVIDER];

export function isAssistantProvider(value: string | null | undefined): value is AssistantProvider {
  return value === ASSISTANT_PROVIDER.GROQ || value === ASSISTANT_PROVIDER.GITHUB_MODELS;
}

export function isTranscriptionProvider(value: string | null | undefined): value is TranscriptionProvider {
  return value === TRANSCRIPTION_PROVIDER.GROQ;
}

export function resolveAssistantProvider(user: Pick<User, "assistantProvider"> | null | undefined): AssistantProvider {
  return isAssistantProvider(user?.assistantProvider) ? user.assistantProvider : ASSISTANT_PROVIDER.GROQ;
}

export function resolveAssistantModel(user: Pick<User, "assistantProvider" | "assistantModel"> | null | undefined) {
  const provider = resolveAssistantProvider(user);
  const model = user?.assistantModel?.trim();
  return model || DEFAULT_ASSISTANT_MODEL_BY_PROVIDER[provider];
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
      value: ASSISTANT_PROVIDER.GROQ,
      label: "Groq",
      description: "Use direct Groq-hosted models with the existing API key boundary.",
      defaultModel: DEFAULT_ASSISTANT_MODEL_BY_PROVIDER[ASSISTANT_PROVIDER.GROQ],
      suggestedModels: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    },
    {
      value: ASSISTANT_PROVIDER.GITHUB_MODELS,
      label: "GitHub Models",
      description: "Use a GitHub-backed model API token and choose a supported chat model.",
      defaultModel: DEFAULT_ASSISTANT_MODEL_BY_PROVIDER[ASSISTANT_PROVIDER.GITHUB_MODELS],
      suggestedModels: ["gpt-4o-mini", "gpt-4.1-mini", "Phi-4-mini-instruct"],
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
