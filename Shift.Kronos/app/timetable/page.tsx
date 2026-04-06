import { AppShell } from "@/components/layout/app-shell";
import { TimetableForm } from "@/components/timetable/timetable-form";
import { TimetableUpcomingList } from "@/components/timetable/timetable-upcoming-list";
import { TimetableWeeklyGrid } from "@/components/timetable/timetable-weekly-grid";
import { requireCurrentUser } from "@/lib/current-user";
import { getTimetableCollections } from "@/lib/timetable/service";

export const dynamic = "force-dynamic";

export default async function TimetablePage() {
  const user = await requireCurrentUser();
  const timetable = await getTimetableCollections(user.id);

  return (
    <AppShell
      title="Semester-aware timetable management"
      eyebrow="Phase 7"
      description="Timetable entries stay deterministic and importable through structured JSON, with the route polished for stronger responsiveness and clearer operational states."
      currentPath="/timetable"
    >
      <div className="space-y-4">
        <TimetableForm />
        <TimetableWeeklyGrid occurrences={timetable.weekly} />
        <TimetableUpcomingList occurrences={timetable.upcoming} />
      </div>
    </AppShell>
  );
}
