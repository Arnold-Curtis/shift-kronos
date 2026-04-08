"use client";

import { useActionState, useEffect } from "react";
import { createTimetableEntryAction, importTimetableEntriesAction } from "@/app/timetable/actions";
import { INITIAL_TIMETABLE_ACTION_STATE } from "@/app/timetable/action-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

function StatusMessage({
  status,
  message,
}: {
  status: "idle" | "success" | "error";
  message?: string;
}) {
  if (status === "idle" || !message) {
    return null;
  }

  return (
    <p
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm leading-6",
        status === "success"
          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
          : "border-rose-400/30 bg-rose-500/10 text-rose-100",
      )}
    >
      {message}
    </p>
  );
}

export function TimetableForm() {
  const { addToast } = useToast();
  const [manualState, manualAction] = useActionState(
    createTimetableEntryAction,
    INITIAL_TIMETABLE_ACTION_STATE,
  );
  const [importState, importAction] = useActionState(
    importTimetableEntriesAction,
    INITIAL_TIMETABLE_ACTION_STATE,
  );

  useEffect(() => {
    if (manualState.status === "success" && manualState.message) {
      addToast("success", manualState.message);
    }

    if (manualState.status === "error" && manualState.message) {
      addToast("error", manualState.message);
    }
  }, [addToast, manualState]);

  useEffect(() => {
    if (importState.status === "success" && importState.message) {
      addToast("success", importState.message);
    }

    if (importState.status === "error" && importState.message) {
      addToast("error", importState.message);
    }
  }, [addToast, importState]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <form action={manualAction} className="grid gap-4 rounded-3xl border border-border bg-panel px-5 py-5">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">Manual entry</p>
          <h2 className="mt-3 text-xl font-semibold text-foreground">Add a recurring class</h2>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            Save a single class definition and Shift:Kronos will expand it across the semester range.
          </p>
        </div>

        <StatusMessage status={manualState.status} message={manualState.message} />

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

      <form action={importAction} className="grid gap-4 rounded-3xl border border-border bg-panel px-5 py-5">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">Structured import</p>
          <h3 className="mt-3 text-xl font-semibold text-foreground">Paste timetable JSON</h3>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            Import is strict by design. Use an object with an <code>entries</code> array. Append is the safe default. Replace mode removes only entries whose semester ranges overlap with the imported payload.
          </p>
        </div>

        <StatusMessage status={importState.status} message={importState.message} />

        <label className="space-y-2 text-sm text-foreground-muted">
          <span className="block font-medium text-foreground">Import mode</span>
          <select name="mode" defaultValue="append" className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none">
            <option value="append">Append to existing timetable</option>
            <option value="replace-semester">Replace overlapping semester entries</option>
          </select>
        </label>

        <div className="rounded-2xl border border-border bg-black/10 px-4 py-4 text-xs leading-6 text-foreground-muted">
          <p className="font-semibold text-foreground">Accepted fields per entry</p>
          <p>
            <code>subject</code>, <code>dayOfWeek</code>, <code>startTime</code>, <code>endTime</code>, <code>semesterStart</code>, <code>semesterEnd</code>, and optional <code>location</code>, <code>lecturer</code>, <code>reminderLeadMinutes</code>.
          </p>
        </div>

        <textarea
          name="payload"
          required
          rows={16}
          className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 font-mono text-sm text-foreground outline-none"
          placeholder={"{\n  \"entries\": [\n    {\n      \"subject\": \"Operating Systems\",\n      \"location\": \"Hall A\",\n      \"lecturer\": \"Dr. Mensah\",\n      \"dayOfWeek\": 1,\n      \"startTime\": \"09:00\",\n      \"endTime\": \"11:00\",\n      \"semesterStart\": \"2026-04-06\",\n      \"semesterEnd\": \"2026-07-31\",\n      \"reminderLeadMinutes\": 30\n    }\n  ]\n}"}
        />

        <SubmitButton
          idleLabel="Import timetable"
          pendingLabel="Importing timetable"
          className="w-full rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition hover:border-white/20 hover:bg-white/5 sm:w-auto"
        />
      </form>
    </div>
  );
}
