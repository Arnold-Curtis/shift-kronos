"use client";

import { RouteError } from "@/components/feedback/route-error";

export default function FilesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      title="Files could not be loaded"
      description="The file-management route failed while loading metadata or indexing state. Retry to restore the file workspace."
      reset={reset}
    />
  );
}
