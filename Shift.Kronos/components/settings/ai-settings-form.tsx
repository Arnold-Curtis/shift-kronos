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
  const assistantModelLooksLegacy =
    currentAssistantProvider === "openrouter" && Boolean(currentAssistantModel) && !currentAssistantModel.includes("/");

  return (
    <form action={updateUserAiSettingsAction} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-black/10 px-4 py-4">
          <label className="text-sm font-semibold text-foreground" htmlFor="assistantProvider">
            Assistant provider
          </label>
          <select
            id="assistantProvider"
            name="assistantProvider"
            defaultValue={currentAssistantProvider}
            className="mt-3 w-full rounded-2xl border border-border bg-panel px-4 py-3 text-sm text-foreground outline-none"
          >
            {assistantOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-3 text-sm leading-6 text-foreground-muted">
            OpenRouter is the assistant backend for chat, quick capture, and grounded answers. The model can be changed later without changing the integration.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-black/10 px-4 py-4">
          <label className="text-sm font-semibold text-foreground" htmlFor="assistantModel">
            Assistant model
          </label>
          <input
            id="assistantModel"
            name="assistantModel"
            defaultValue={currentAssistantModel}
            required
            className="mt-3 w-full rounded-2xl border border-border bg-panel px-4 py-3 text-sm text-foreground outline-none"
          />
          <p className="mt-3 text-sm leading-6 text-foreground-muted">
            Recommended models: {assistantOptions.flatMap((option) => option.suggestedModels).join(", ")}.
          </p>
          {assistantModelLooksLegacy ? (
            <p className="mt-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm leading-6 text-amber-100">
              The saved assistant model looks like a legacy non-OpenRouter id. Saving settings will reset it to a compatible OpenRouter model automatically.
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border bg-black/10 px-4 py-4">
          <label className="text-sm font-semibold text-foreground" htmlFor="transcriptionProvider">
            Transcription provider
          </label>
          <select
            id="transcriptionProvider"
            name="transcriptionProvider"
            defaultValue={currentTranscriptionProvider}
            className="mt-3 w-full rounded-2xl border border-border bg-panel px-4 py-3 text-sm text-foreground outline-none"
          >
            {transcriptionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-3 text-sm leading-6 text-foreground-muted">
            Recorded audio is uploaded and transcribed through this provider before entering the assistant workflow.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-black/10 px-4 py-4">
          <label className="text-sm font-semibold text-foreground" htmlFor="transcriptionModel">
            Transcription model
          </label>
          <input
            id="transcriptionModel"
            name="transcriptionModel"
            defaultValue={currentTranscriptionModel}
            required
            className="mt-3 w-full rounded-2xl border border-border bg-panel px-4 py-3 text-sm text-foreground outline-none"
          />
          <p className="mt-3 text-sm leading-6 text-foreground-muted">
            Example models: {transcriptionOptions.flatMap((option) => option.suggestedModels).join(", ")}.
          </p>
        </div>
      </div>

      <SubmitButton
        idleLabel="Save AI settings"
        pendingLabel="Saving AI settings"
        className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 sm:w-auto"
      />
    </form>
  );
}
