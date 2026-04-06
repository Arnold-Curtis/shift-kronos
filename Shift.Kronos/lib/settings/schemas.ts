import { z } from "zod";
import {
  ASSISTANT_PROVIDER,
  TRANSCRIPTION_PROVIDER,
} from "@/lib/ai/preferences";

export const userAiSettingsSchema = z.object({
  assistantProvider: z.enum([ASSISTANT_PROVIDER.OPENROUTER]),
  assistantModel: z.string().trim().min(1).max(120),
  transcriptionProvider: z.enum([TRANSCRIPTION_PROVIDER.GROQ]),
  transcriptionModel: z.string().trim().min(1).max(120),
});

export type UserAiSettingsInput = z.infer<typeof userAiSettingsSchema>;
