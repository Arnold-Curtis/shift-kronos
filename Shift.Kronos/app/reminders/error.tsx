"use client";

import { RouteError } from "@/components/feedback/route-error";

export default function RemindersError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      title="Reminders could not be loaded"
      description="The reminder management surface failed to assemble. Retry to reload your deterministic reminder collections."
      reset={reset}
    />
  );
}
