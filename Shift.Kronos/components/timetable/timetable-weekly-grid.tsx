import { SectionCard } from "@/components/dashboard/section-card";
import { formatTimeLabel } from "@/lib/datetime";
import { TimetableOccurrence } from "@/lib/timetable/types";

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DISPLAY_TIMEZONE = "Africa/Nairobi";

function getDisplayWeekday(date: Date) {
  const label = new Intl.DateTimeFormat("en-GB", { timeZone: DISPLAY_TIMEZONE, weekday: "short" })
    .format(date)
    .replace(/[^A-Za-z]/g, "");

  return weekdayLabels.indexOf(label) + 1;
}

type TimetableWeeklyGridProps = {
  occurrences: TimetableOccurrence[];
};

export function TimetableWeeklyGrid({ occurrences }: TimetableWeeklyGridProps) {
  const grouped = weekdayLabels.map((_, index) =>
    occurrences.filter((occurrence) => {
      const normalized = getDisplayWeekday(occurrence.startsAt);
      return normalized === index + 1;
    }),
  );

  return (
    <SectionCard title="Weekly timetable" description="A deterministic weekly view over the current semester date range.">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {weekdayLabels.map((label, index) => (
          <div key={label} className="rounded-2xl border border-border bg-black/10 px-3 py-3">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <div className="mt-3 space-y-2">
              {grouped[index].length === 0 ? (
                <p className="text-sm text-foreground-muted">No classes</p>
              ) : (
                grouped[index].map((occurrence) => (
                  <article key={`${occurrence.entryId}-${occurrence.startsAt.toISOString()}`} className="rounded-2xl border border-border bg-panel px-3 py-3">
                    <p className="text-sm font-semibold text-foreground">{occurrence.subject}</p>
                    <p className="mt-1 text-xs text-foreground-muted">
                      {formatTimeLabel(occurrence.startsAt, DISPLAY_TIMEZONE)} - {formatTimeLabel(occurrence.endsAt, DISPLAY_TIMEZONE)}
                    </p>
                    {occurrence.location ? <p className="mt-2 text-xs text-foreground-muted">{occurrence.location}</p> : null}
                  </article>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
