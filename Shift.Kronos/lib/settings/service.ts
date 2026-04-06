import { db } from "@/lib/db";
import { resolveAssistantModel, resolveAssistantProvider, resolveTranscriptionModel, resolveTranscriptionProvider } from "@/lib/ai/preferences";
import { UserAiSettingsInput, userAiSettingsSchema } from "@/lib/settings/schemas";

export async function updateUserAiSettings(userId: string, input: UserAiSettingsInput) {
  const values = userAiSettingsSchema.parse(input);

  return db.user.update({
    where: {
      id: userId,
    },
    data: {
      assistantProvider: values.assistantProvider,
      assistantModel: values.assistantModel,
      transcriptionProvider: values.transcriptionProvider,
      transcriptionModel: values.transcriptionModel,
    },
  });
}

export function getResolvedUserAiSettings(user: {
  assistantProvider: string;
  assistantModel: string | null;
  transcriptionProvider: string;
  transcriptionModel: string | null;
}) {
  return {
    assistantProvider: resolveAssistantProvider(user),
    assistantModel: resolveAssistantModel(user),
    transcriptionProvider: resolveTranscriptionProvider(user),
    transcriptionModel: resolveTranscriptionModel(user),
  };
}
