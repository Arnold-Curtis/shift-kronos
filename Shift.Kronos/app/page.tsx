import { GreetingHeader } from "@/components/home/greeting-header";
import { QuickAddBar } from "@/components/home/quick-add-bar";
import { LiveAgenda } from "@/components/dashboard/live-agenda";
import { FocusPanel } from "@/components/dashboard/focus-panel";
import { WeekAheadPanel } from "@/components/dashboard/week-ahead-panel";
import { InboxPreview } from "@/components/home/inbox-preview";
import { requireCurrentUser } from "@/lib/current-user";
import { getDashboardData } from "@/lib/dashboard/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireCurrentUser();
  const dashboard = await getDashboardData(user.id);

  return (
    <div className="space-y-6 pb-4">
      <GreetingHeader
        displayName={user.displayName}
        agendaCount={dashboard.todayAgenda.length}
      />

      <QuickAddBar />

      <FocusPanel reminders={dashboard.highPriority} />

      <LiveAgenda items={dashboard.todayAgenda} />

      <WeekAheadPanel items={dashboard.weekAhead} />

      <InboxPreview items={dashboard.inbox} />
    </div>
  );
}
