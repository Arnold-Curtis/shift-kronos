import { SectionCard } from "@/components/dashboard/section-card";
import { formatDateTimeLabel } from "@/lib/datetime";
import { TimetableOccurrence } from "@/lib/timetable/types";

const DISPLAY_TIMEZONE = "Africa/Nairobi";

type TimetableUpcomingListProps = {
  occurrences: TimetableOccurrence[];
};

export function TimetableUpcomingList({ occurrences }: TimetableUpcomingListProps) {
  return (
    <SectionCard title="Upcoming classes" description="The nearest upcoming timetable occurrences in chronological order.">
      {occurrences.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm leading-6 text-foreground-muted">
          No upcoming classes were found in the current week window.
        </p>
      ) : (
        <div className="space-y-3">
          {occurrences.map((occurrence) => (
            <article key={`${occurrence.entryId}-${occurrence.startsAt.toISOString()}`} className="rounded-2xl border border-border bg-black/10 px-4 py-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{occurrence.subject}</h3>
                  <p className="mt-1 text-sm text-foreground-muted">{formatDateTimeLabel(occurrence.startsAt, DISPLAY_TIMEZONE)}</p>
                </div>
                <div className="text-sm text-foreground-muted">
                  {occurrence.location ?? "Location pending"}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
