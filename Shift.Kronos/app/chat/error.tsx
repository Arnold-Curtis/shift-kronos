"use client";

import { RouteError } from "@/components/feedback/route-error";

export default function ChatError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      title="Chat could not be loaded"
      description="Assistant conversations or memory-aware continuity failed to load for this route. Retry the page to rebuild the chat workspace."
      reset={reset}
    />
  );
}
