import { AppShell } from "@/components/layout/app-shell";
import { ReminderForm } from "@/components/reminders/reminder-form";
import { ReminderList } from "@/components/reminders/reminder-list";
import { requireCurrentUser } from "@/lib/current-user";
import { getReminderCollections } from "@/lib/reminders/service";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const user = await requireCurrentUser();
  const reminders = await getReminderCollections(user.id);

  return (
    <AppShell
      title="Deterministic reminder management"
      eyebrow="Phase 7"
      description="Reminders remain server-validated and deterministic, with the route now hardened for clearer states, daily mobile use, and operational reliability."
      currentPath="/reminders"
    >
      <div className="space-y-4">
        <ReminderForm />

        <div className="grid gap-4 xl:grid-cols-2">
          <ReminderList
            title="Inbox"
            description="Unscheduled captures stay visible until they are intentionally planned."
            reminders={reminders.inbox}
            emptyState="Your inbox is empty. Quick captures added as inbox items will appear here."
          />
          <ReminderList
            title="High-priority focus"
            description="High-priority reminders remain easy to review without filtering through every item."
            reminders={reminders.highPriority}
            emptyState="No high-priority reminders are active right now."
          />
        </div>

        <ReminderList
          title="Scheduled reminders"
          description="One-time reminders, recurring reminders, and habits are grouped here once they have real scheduling context."
          reminders={reminders.scheduled}
          emptyState="No scheduled reminders yet. Create one above to build the next deterministic layer of the product."
        />

        <div className="grid gap-4 xl:grid-cols-2">
          <ReminderList
            title="Countdowns"
            description="Countdown reminders are still date-driven reminders, but called out here because their urgency tightens as the target date approaches."
            reminders={reminders.countdowns}
            emptyState="No countdown reminders are active right now."
          />
          <ReminderList
            title="Completed history"
            description="Completed reminders are retained so history remains visible and later reporting stays possible."
            reminders={reminders.completed}
            emptyState="Completed reminders will appear here once work starts getting finished."
            showReactivate
          />
        </div>
      </div>
    </AppShell>
  );
}
