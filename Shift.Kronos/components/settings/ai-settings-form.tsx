import { updateUserAiSettingsAction } from "@/app/settings/actions";
import { SubmitButton } from "@/components/forms/submit-button";

type Option = {
  value: string;
  label: string;
  description: string;
  defaultModel: string;
  suggestedModels: string[];
};

type AiSettingsFormProps = {
  assistantOptions: Option[];
  transcriptionOptions: Option[];
  currentAssistantProvider: string;
  currentAssistantModel: string;
  currentTranscriptionProvider: string;
  currentTranscriptionModel: string;
};

export function AiSettingsForm({
  assistantOptions,
  transcriptionOptions,
  currentAssistantProvider,
  currentAssistantModel,
  currentTranscriptionProvider,
  currentTranscriptionModel,
}: AiSettingsFormProps) {
  return (
    <form action={updateUserAiSettingsAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="block font-medium text-text-primary">Assistant provider</span>
          <select
            name="assistantProvider"
            defaultValue={currentAssistantProvider}
            className="input-field"
          >
            {assistantOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="block font-medium text-text-primary">Assistant model</span>
          <input
            name="assistantModel"
            defaultValue={currentAssistantModel}
            required
            className="input-field"
          />
          <p className="text-xs text-text-tertiary">
            e.g. {assistantOptions.flatMap((o) => o.suggestedModels).slice(0, 2).join(", ")}
          </p>
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="block font-medium text-text-primary">Transcription provider</span>
          <select
            name="transcriptionProvider"
            defaultValue={currentTranscriptionProvider}
            className="input-field"
          >
            {transcriptionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="block font-medium text-text-primary">Transcription model</span>
          <input
            name="transcriptionModel"
            defaultValue={currentTranscriptionModel}
            required
            className="input-field"
          />
        </label>
      </div>

      <SubmitButton
        idleLabel="Save"
        pendingLabel="Saving..."
        className="btn-primary w-full sm:w-auto"
      />
    </form>
  );
}
