import { ReminderForm } from "@/components/reminders/reminder-form";
import { ReminderList } from "@/components/reminders/reminder-list";
import { requireCurrentUser } from "@/lib/current-user";
import { getReminderCollections } from "@/lib/reminders/service";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const user = await requireCurrentUser();
  const reminders = await getReminderCollections(user.id);

  return (
    <div className="space-y-6 pb-4">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition hover:bg-bg-surface-hover hover:text-text-primary"
        >
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">Reminders</h1>
          <p className="mt-0.5 text-sm text-text-secondary">All your reminders in one place.</p>
        </div>
      </header>

      <ReminderForm />

      <div className="space-y-6">
        <ReminderList
          title="Inbox"
          reminders={reminders.inbox}
          emptyState="Your inbox is empty."
        />

        <ReminderList
          title="High Priority"
          reminders={reminders.highPriority}
          emptyState="No high-priority reminders right now."
        />

        <ReminderList
          title="Scheduled"
          reminders={reminders.scheduled}
          emptyState="No scheduled reminders yet."
        />

        <ReminderList
          title="Countdowns"
          reminders={reminders.countdowns}
          emptyState="No countdowns active."
        />

        <ReminderList
          title="Completed"
          reminders={reminders.completed}
          emptyState="No completed reminders yet."
          showReactivate
        />
      </div>
    </div>
  );
}
