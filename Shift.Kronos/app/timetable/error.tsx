"use client";

import { RouteError } from "@/components/feedback/route-error";

export default function TimetableError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      title="Timetable could not be loaded"
      description="The timetable workspace failed while assembling stored entries or computed occurrences. Retry to restore the schedule view."
      reset={reset}
    />
  );
}
