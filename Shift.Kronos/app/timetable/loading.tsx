import { AppShell } from "@/components/layout/app-shell";
import { LoadingCard } from "@/components/feedback/loading-card";

export default function TimetableLoading() {
  return (
    <AppShell
      title="Semester-aware timetable management"
      eyebrow="Phase 7"
      description="Loading timetable entries, weekly occurrences, and upcoming class views."
      currentPath="/timetable"
    >
      <LoadingCard
        title="Loading timetable"
        description="Weekly and upcoming timetable views are being calculated before the route becomes interactive."
      />
    </AppShell>
  );
}
