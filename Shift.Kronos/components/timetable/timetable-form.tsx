import { createTimetableEntryAction, importTimetableEntriesAction } from "@/app/timetable/actions";
import { SubmitButton } from "@/components/forms/submit-button";

export function TimetableForm() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <form action={createTimetableEntryAction} className="grid gap-4 rounded-3xl border border-border bg-panel px-5 py-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-foreground-muted">
            <span className="block font-medium text-foreground">Subject</span>
            <input name="subject" required className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none" />
          </label>

          <label className="space-y-2 text-sm text-foreground-muted">
            <span className="block font-medium text-foreground">Day of week</span>
            <select name="dayOfWeek" defaultValue="1" className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none">
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
              <option value="7">Sunday</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2 text-sm text-foreground-muted">
            <span className="block font-medium text-foreground">Start time</span>
            <input name="startTime" type="time" required className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none" />
          </label>

          <label className="space-y-2 text-sm text-foreground-muted">
            <span className="block font-medium text-foreground">End time</span>
            <input name="endTime" type="time" required className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none" />
          </label>

          <label className="space-y-2 text-sm text-foreground-muted">
            <span className="block font-medium text-foreground">Semester start</span>
            <input name="semesterStart" type="date" required className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none" />
          </label>

          <label className="space-y-2 text-sm text-foreground-muted">
            <span className="block font-medium text-foreground">Semester end</span>
            <input name="semesterEnd" type="date" required className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none" />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm text-foreground-muted">
            <span className="block font-medium text-foreground">Location</span>
            <input name="location" className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none" />
          </label>

          <label className="space-y-2 text-sm text-foreground-muted">
            <span className="block font-medium text-foreground">Lecturer</span>
            <input name="lecturer" className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none" />
          </label>

          <label className="space-y-2 text-sm text-foreground-muted">
            <span className="block font-medium text-foreground">Lead minutes</span>
            <input name="reminderLeadMinutes" type="number" min="0" max="1440" defaultValue="30" className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none" />
          </label>
        </div>

        <SubmitButton
          idleLabel="Save class entry"
          pendingLabel="Saving class entry"
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 sm:w-auto"
        />
      </form>

      <form action={importTimetableEntriesAction} className="grid gap-4 rounded-3xl border border-border bg-panel px-5 py-5">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">Structured import</p>
          <h3 className="mt-3 text-xl font-semibold text-foreground">Paste validated timetable JSON</h3>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            Import is strict by design. The payload should be an object with an <code>entries</code> array using the same fields as the manual form.
          </p>
        </div>

        <textarea name="payload" required rows={14} className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 font-mono text-sm text-foreground outline-none" placeholder='{"entries":[{"subject":"Operating Systems","dayOfWeek":1,"startTime":"09:00","endTime":"11:00","semesterStart":"2026-04-06","semesterEnd":"2026-07-31","reminderLeadMinutes":30}]}' />

        <SubmitButton
          idleLabel="Import timetable"
          pendingLabel="Importing timetable"
          className="w-full rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition hover:border-white/20 hover:bg-white/5 sm:w-auto"
        />
      </form>
    </div>
  );
}
