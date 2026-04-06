import { createReminderAction } from "@/app/reminders/actions";
import { SubmitButton } from "@/components/forms/submit-button";

const reminderTypes = [
  { value: "ONE_TIME", label: "One-time" },
  { value: "RECURRING", label: "Recurring" },
  { value: "HABIT", label: "Habit" },
  { value: "COUNTDOWN", label: "Countdown" },
  { value: "INBOX", label: "Inbox" },
] as const;

const priorities = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
] as const;

const recurrenceFrequencies = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
] as const;

export function ReminderForm() {
  return (
    <form action={createReminderAction} className="grid gap-4 rounded-3xl border border-border bg-panel px-5 py-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-foreground-muted">
          <span className="block font-medium text-foreground">Title</span>
          <input name="title" required className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none" />
        </label>

        <label className="space-y-2 text-sm text-foreground-muted">
          <span className="block font-medium text-foreground">Type</span>
          <select name="type" defaultValue="ONE_TIME" className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none">
            {reminderTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="space-y-2 text-sm text-foreground-muted">
        <span className="block font-medium text-foreground">Description</span>
        <textarea name="description" rows={3} className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none" />
      </label>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2 text-sm text-foreground-muted">
          <span className="block font-medium text-foreground">Priority</span>
          <select name="priority" defaultValue="MEDIUM" className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none">
            {priorities.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-foreground-muted">
          <span className="block font-medium text-foreground">Category</span>
          <input name="category" className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none" />
        </label>

        <label className="space-y-2 text-sm text-foreground-muted">
          <span className="block font-medium text-foreground">Tags</span>
          <input name="tags" placeholder="school, admin, urgent" className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none" />
        </label>

        <label className="space-y-2 text-sm text-foreground-muted">
          <span className="block font-medium text-foreground">Due at</span>
          <input name="dueAt" type="datetime-local" className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none" />
        </label>
      </div>

      <div className="grid gap-4 rounded-2xl border border-border bg-black/10 px-4 py-4 md:grid-cols-4">
        <label className="space-y-2 text-sm text-foreground-muted">
          <span className="block font-medium text-foreground">Recurrence frequency</span>
          <select name="recurrenceFrequency" defaultValue="DAILY" className="w-full rounded-2xl border border-border bg-panel px-4 py-3 text-foreground outline-none">
            {recurrenceFrequencies.map((frequency) => (
              <option key={frequency.value} value={frequency.value}>
                {frequency.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-foreground-muted">
          <span className="block font-medium text-foreground">Interval</span>
          <input name="recurrenceInterval" type="number" min="1" defaultValue="1" className="w-full rounded-2xl border border-border bg-panel px-4 py-3 text-foreground outline-none" />
        </label>

        <label className="space-y-2 text-sm text-foreground-muted">
          <span className="block font-medium text-foreground">Weekdays</span>
          <input name="recurrenceDays" placeholder="1,3,5" className="w-full rounded-2xl border border-border bg-panel px-4 py-3 text-foreground outline-none" />
        </label>

        <label className="space-y-2 text-sm text-foreground-muted">
          <span className="block font-medium text-foreground">Recurrence ends</span>
          <input name="recurrenceEndAt" type="datetime-local" className="w-full rounded-2xl border border-border bg-panel px-4 py-3 text-foreground outline-none" />
        </label>
      </div>

      <SubmitButton
        idleLabel="Save reminder"
        pendingLabel="Saving reminder"
        className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 sm:w-auto"
      />
    </form>
  );
}
