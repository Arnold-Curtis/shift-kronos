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
    <form action={createReminderAction} className="glass space-y-4 p-4">
      <h3 className="text-sm font-semibold text-text-primary">New Reminder</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="block font-medium text-text-primary">Title</span>
          <input name="title" required className="input-field" placeholder="What to remember?" />
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="block font-medium text-text-primary">Type</span>
          <select name="type" defaultValue="ONE_TIME" className="input-field">
            {reminderTypes.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-1.5 text-sm">
        <span className="font-medium text-text-primary">Description</span>
        <textarea name="description" rows={2} className="input-field" placeholder="Optional details..." />
      </label>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1.5 text-sm">
          <span className="block font-medium text-text-primary">Priority</span>
          <select name="priority" defaultValue="MEDIUM" className="input-field">
            {priorities.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="block font-medium text-text-primary">Category</span>
          <input name="category" className="input-field" placeholder="e.g. school" />
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="block font-medium text-text-primary">Tags</span>
          <input name="tags" className="input-field" placeholder="school, admin" />
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="block font-medium text-text-primary">Due at</span>
          <input name="dueAt" type="datetime-local" className="input-field" />
        </label>
      </div>

      <details className="group">
        <summary className="cursor-pointer text-xs font-medium text-text-tertiary transition hover:text-text-secondary">
          Recurrence options ▾
        </summary>
        <div className="mt-3 grid gap-3 rounded-xl border border-border-subtle bg-bg-surface p-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5 text-sm">
            <span className="block font-medium text-text-primary">Frequency</span>
            <select name="recurrenceFrequency" defaultValue="DAILY" className="input-field">
              {recurrenceFrequencies.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="block font-medium text-text-primary">Interval</span>
            <input name="recurrenceInterval" type="number" min="1" defaultValue="1" className="input-field" />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="block font-medium text-text-primary">Weekdays</span>
            <input name="recurrenceDays" placeholder="1,3,5" className="input-field" />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="block font-medium text-text-primary">Ends</span>
            <input name="recurrenceEndAt" type="datetime-local" className="input-field" />
          </label>
        </div>
      </details>

      <SubmitButton
        idleLabel="Save reminder"
        pendingLabel="Saving..."
        className="btn-primary w-full sm:w-auto"
      />
    </form>
  );
}
