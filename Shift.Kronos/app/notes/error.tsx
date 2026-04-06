"use client";

import { RouteError } from "@/components/feedback/route-error";

export default function NotesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      title="Notes could not be loaded"
      description="The note management route failed while loading stored notes or retrieval state. Retry to restore the notes workspace."
      reset={reset}
    />
  );
}
