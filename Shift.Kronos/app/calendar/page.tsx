import { CalendarView } from "@/components/calendar/calendar-view";
import { requireCurrentUser } from "@/lib/current-user";
import { getCalendarEvents } from "@/lib/calendar/queries";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await requireCurrentUser();
  const events = await getCalendarEvents(user.id);

  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-text-primary">Calendar</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Your reminders and classes in one view.
        </p>
      </header>

      <CalendarView events={events} />
    </div>
  );
}
