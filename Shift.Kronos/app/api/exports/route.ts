import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/current-user";
import {
  buildUserExport,
  EXPORT_DATASET,
  EXPORT_FORMAT,
  getExportContentDisposition,
} from "@/lib/export/service";
import { logError, logInfo, logWarn } from "@/lib/observability/logger";

const exportQuerySchema = z.object({
  dataset: z.enum([
    EXPORT_DATASET.FULL,
    EXPORT_DATASET.REMINDERS,
    EXPORT_DATASET.TIMETABLE,
    EXPORT_DATASET.NOTES,
    EXPORT_DATASET.NOTIFICATION_EVENTS,
  ]),
  format: z.enum([EXPORT_FORMAT.JSON, EXPORT_FORMAT.CSV]),
});

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser();
    const url = new URL(request.url);
    const params = exportQuerySchema.parse({
      dataset: url.searchParams.get("dataset"),
      format: url.searchParams.get("format"),
    });

    const payload = await buildUserExport(user.id, params.dataset, params.format);

    logInfo("export.generated", {
      userId: user.id,
      dataset: params.dataset,
      format: params.format,
      filename: payload.filename,
    });

    return new NextResponse(payload.body, {
      status: 200,
      headers: {
        "Content-Type": payload.contentType,
        "Content-Disposition": getExportContentDisposition(payload.filename),
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logWarn("export.invalid-request", {
        issues: error.issues,
      });

      return NextResponse.json({ error: "Invalid export request." }, { status: 400 });
    }

    logError("export.failed", {
      error,
    });

    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}
