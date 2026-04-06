"use client";

import { RouteError } from "@/components/feedback/route-error";

export default function SettingsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      title="Settings could not be loaded"
      description="The operational settings surface failed while loading profile or export information. Retry to restore access to exports and backup guidance."
      reset={reset}
    />
  );
}
