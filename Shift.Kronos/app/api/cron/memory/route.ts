import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { backfillUserMemory } from "@/lib/memory/service";
import { requireCurrentUser } from "@/lib/current-user";
import { isAuthorizedCronRequest } from "@/lib/operations/auth";
import { logError, logInfo, logWarn } from "@/lib/observability/logger";

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    logWarn("cron.memory.unauthorized", {
      path: new URL(request.url).pathname,
    });

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await auth();

  if (!session.userId) {
    logWarn("cron.memory.missing-session", {
      path: new URL(request.url).pathname,
    });

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await requireCurrentUser();
    const createdArtifactIds = await backfillUserMemory(user.id);

    logInfo("cron.memory.completed", {
      path: new URL(request.url).pathname,
      userId: user.id,
      createdCount: createdArtifactIds.length,
    });

    return NextResponse.json({
      createdArtifactIds,
      count: createdArtifactIds.length,
    });
  } catch (error) {
    logError("cron.memory.failed", {
      path: new URL(request.url).pathname,
      userId: session.userId,
      error,
    });

    return NextResponse.json({ error: "Memory backfill failed" }, { status: 500 });
  }
}
