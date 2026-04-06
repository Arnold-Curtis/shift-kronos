"use client";

import { RouteError } from "@/components/feedback/route-error";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      title="The app could not finish loading"
      description="Shift:Kronos hit an unexpected failure while assembling the current screen. Phase 7 makes these failures visible so they can be retried and monitored instead of disappearing behind a blank route."
      reset={reset}
    />
  );
}
