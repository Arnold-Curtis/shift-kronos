import { submitQuickCaptureAction, submitVoiceCaptureAction } from "@/app/chat/actions";
import { SubmitButton } from "@/components/forms/submit-button";

export function QuickCaptureForm() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <form action={submitQuickCaptureAction} className="grid gap-3 rounded-3xl border border-border bg-panel px-5 py-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Natural-language quick capture</p>
          <p className="text-sm leading-6 text-foreground-muted">
            Type naturally to create reminders through the same validated server-side reminder pipeline used everywhere else in the product.
          </p>
        </div>

        <textarea
          name="input"
          rows={4}
          required
          placeholder="Remind me to submit the assignment tomorrow at 8pm"
          className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none"
        />

        <SubmitButton
          idleLabel="Capture with assistant"
          pendingLabel="Capturing"
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 sm:w-auto"
        />
      </form>

      <form action={submitVoiceCaptureAction} className="grid gap-3 rounded-3xl border border-border bg-panel px-5 py-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Voice-to-action path</p>
          <p className="text-sm leading-6 text-foreground-muted">
            Phase 4 uses a transcription boundary first, then runs the same parse-and-execute workflow used by typed capture.
          </p>
        </div>

        <textarea
          name="transcript"
          rows={4}
          required
          placeholder="Simulated transcript: remind me to revise operating systems tonight"
          className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none"
        />

        <SubmitButton
          idleLabel="Run voice workflow"
          pendingLabel="Running voice workflow"
          className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-white/5 sm:w-auto"
        />
      </form>
    </div>
  );
}
