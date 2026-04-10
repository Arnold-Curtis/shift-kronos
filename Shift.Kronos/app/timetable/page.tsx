import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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
    <div className="space-y-6 pb-4">
      <header className="flex items-center gap-3">
        <Link
          href="/me"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition hover:bg-bg-surface-hover hover:text-text-primary"
        >
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">Timetable</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Import your semester schedule, review weekly classes, and keep email alerts aligned.
          </p>
        </div>
      </header>

      <TimetableForm />

      <div className="space-y-6">
        <TimetableWeeklyGrid occurrences={timetable.weekly} />
        <TimetableUpcomingList occurrences={timetable.upcoming} />
      </div>
    </div>
  );
}
