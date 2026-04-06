import { AppShell } from "@/components/layout/app-shell";
import { QuickCaptureForm } from "@/components/assistant/quick-capture-form";
import { FocusPanel } from "@/components/dashboard/focus-panel";
import { LiveAgenda } from "@/components/dashboard/live-agenda";
import { MetricCard } from "@/components/dashboard/metric-card";
import { WeekAheadPanel } from "@/components/dashboard/week-ahead-panel";
import { requireCurrentUser } from "@/lib/current-user";
import { getDashboardData } from "@/lib/dashboard/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireCurrentUser();
  const dashboard = await getDashboardData(user.id);

  const metrics = [
    {
      label: "Phase",
      value: "Phase 7",
      detail: "The app now layers operational hardening on top of reminders, timetable, retrieval, and memory so daily use is more dependable.",
    },
    {
      label: "Agenda items",
      value: String(dashboard.todayAgenda.length),
      detail: "Today's merged agenda combines reminders and timetable occurrences through a shared query layer.",
    },
    {
      label: "Inbox load",
      value: String(dashboard.inbox.length),
      detail: "Unscheduled capture remains visible until it is intentionally planned or completed.",
    },
  ];

  return (
    <AppShell
      title="Run your schedule from one dependable home base"
      eyebrow="Shift:Kronos"
      description="Shift:Kronos now combines deterministic scheduling, grounded assistant workflows, retrieval-backed knowledge, and persistent memory in a daily-use workspace hardened for mobile and operational reliability."
      currentPath="/dashboard"
    >
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.95fr]">
        <div className="space-y-4">
          <QuickCaptureForm />

          <section className="grid gap-4 md:grid-cols-3">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                detail={metric.detail}
              />
            ))}
          </section>

          <LiveAgenda items={dashboard.todayAgenda} />
          <WeekAheadPanel items={dashboard.weekAhead} />
        </div>

        <div className="space-y-4">
          <FocusPanel
            title="High-priority focus"
            description="High-priority reminders stay visible here so the dashboard continues to surface what matters first."
            reminders={dashboard.highPriority}
            emptyState="No high-priority reminders are active right now."
          />
          <FocusPanel
            title="Inbox"
            description="Inbox reminders remain unscheduled by design until they are intentionally planned into the rest of the system."
            reminders={dashboard.inbox}
            emptyState="Your inbox is clear."
          />
        </div>
      </div>
    </AppShell>
  );
}
