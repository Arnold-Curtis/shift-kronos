import { db } from "@/lib/db";
import {
  normalizeAssistantModelForProvider,
  resolveAssistantModel,
  resolveAssistantProvider,
  resolveTranscriptionModel,
  resolveTranscriptionProvider,
} from "@/lib/ai/preferences";
import { UserAiSettingsInput, userAiSettingsSchema } from "@/lib/settings/schemas";

export async function updateUserAiSettings(userId: string, input: UserAiSettingsInput) {
  const values = userAiSettingsSchema.parse(input);
  const normalizedAssistantModel = normalizeAssistantModelForProvider(values.assistantProvider, values.assistantModel);

  return db.user.update({
    where: {
      id: userId,
    },
    data: {
      assistantProvider: values.assistantProvider,
      assistantModel: normalizedAssistantModel,
      transcriptionProvider: values.transcriptionProvider,
      transcriptionModel: values.transcriptionModel,
      voiceResponseEnabled: values.voiceResponseEnabled ?? true,
    },
  });
}

export function getResolvedUserAiSettings(user: {
  assistantProvider: string;
  assistantModel: string | null;
  transcriptionProvider: string;
  transcriptionModel: string | null;
  voiceResponseEnabled?: boolean;
}) {
  return {
    assistantProvider: resolveAssistantProvider(user),
    assistantModel: resolveAssistantModel(user),
    transcriptionProvider: resolveTranscriptionProvider(user),
    transcriptionModel: resolveTranscriptionModel(user),
    voiceResponseEnabled: user.voiceResponseEnabled ?? true,
  };
}
