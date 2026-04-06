import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import Link from "next/link";
import { requireCurrentUser } from "@/lib/current-user";
import {
  EXPORT_DATASET,
  EXPORT_FORMAT,
  getAvailableCsvDatasets,
  getExportDatasetDescription,
  getExportDatasetLabel,
} from "@/lib/export/service";

const settingsSections = [
  {
    title: "Timezone policy",
    detail:
      "Shift:Kronos uses a fixed user-configured timezone so reminders, classes, and notifications remain predictable across devices.",
  },
  {
    title: "Telegram linkage",
    detail:
      "Telegram remains the delivery channel. Linking chat identity and delivery preferences belongs in settings, not in feature-specific screens.",
  },
  {
    title: "AI providers",
    detail:
      "Provider keys and future model routing are treated as infrastructure concerns. The product should still behave safely when AI paths are unavailable.",
  },
];

function buildExportHref(dataset: string, format: string) {
  return `/api/exports?dataset=${encodeURIComponent(dataset)}&format=${encodeURIComponent(format)}`;
}

export default async function SettingsPage() {
  const user = await requireCurrentUser();
  const csvDatasets = getAvailableCsvDatasets();

  return (
    <AppShell
      title="Operational controls and personal backups"
      eyebrow="Phase 7"
      description="Phase 7 turns settings into a real operations surface for exports, delivery posture, and backup discipline so the system becomes safer to rely on day to day."
      currentPath="/settings"
    >
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <SectionCard
            title="Profile and delivery state"
            description="The system remains single-user first, so this surface focuses on the current account and delivery-critical configuration."
          >
            <div className="grid gap-3 text-sm text-foreground-muted sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-black/10 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-accent">Display name</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{user.displayName ?? "Not set"}</p>
              </div>
              <div className="rounded-2xl border border-border bg-black/10 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-accent">Timezone</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{user.timezone}</p>
              </div>
              <div className="rounded-2xl border border-border bg-black/10 px-4 py-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.18em] text-accent">Telegram linkage</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {user.telegramChatId ? "Linked for delivery and Telegram chat workflows" : "Not linked yet"}
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground-muted">
                  Telegram remains the primary delivery channel. If chat identity is not linked, scheduled notifications and Telegram assistant interactions cannot be fully trusted.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Full export"
            description="The robust backup path for this phase is a complete JSON export of primary user records. Derived retrieval chunks are excluded because they can be rebuilt from source records."
          >
            <div className="rounded-2xl border border-border bg-black/10 px-4 py-4 text-sm leading-6 text-foreground-muted">
              <p className="font-semibold text-foreground">{getExportDatasetLabel(EXPORT_DATASET.FULL)}</p>
              <p className="mt-2">{getExportDatasetDescription(EXPORT_DATASET.FULL)}</p>
              <p className="mt-2">
                File exports include durable metadata and blob references. Retrieval index records are intentionally omitted from backups because they are derived operational artifacts rather than source-of-truth user content.
              </p>
              <Link
                href={buildExportHref(EXPORT_DATASET.FULL, EXPORT_FORMAT.JSON)}
                className="mt-4 inline-flex rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                Download full JSON export
              </Link>
            </div>
          </SectionCard>

          <SectionCard
            title="Operational guidance"
            description="Phase 7 adds discipline around backups and migrations so operational recovery does not depend on memory or ad hoc steps."
          >
            <div className="space-y-3 text-sm leading-6 text-foreground-muted">
              <p>
                Treat JSON exports as the primary personal backup artifact for source records. Export regularly before major schema changes or deployment changes.
              </p>
              <p>
                Prisma migration history remains part of the operational recovery story. Source records should be preserved directly; derived retrieval data can be rebuilt after restore.
              </p>
              <p>
                Conversations and memory artifacts are included in the full export because they remain user-meaningful continuity records even though memory is derived from raw conversation history.
              </p>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard
            title="CSV exports"
            description="CSV is available for flat operational datasets that benefit from spreadsheet review or external analysis."
          >
            <div className="space-y-3">
              {csvDatasets.map((dataset) => (
                <div key={dataset} className="rounded-2xl border border-border bg-black/10 px-4 py-4">
                  <p className="text-sm font-semibold text-foreground">{getExportDatasetLabel(dataset)}</p>
                  <p className="mt-2 text-sm leading-6 text-foreground-muted">
                    {getExportDatasetDescription(dataset)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={buildExportHref(dataset, EXPORT_FORMAT.CSV)}
                      className="inline-flex rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition hover:border-white/20 hover:bg-white/5"
                    >
                      Download CSV
                    </Link>
                    <Link
                      href={buildExportHref(dataset, EXPORT_FORMAT.JSON)}
                      className="inline-flex rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition hover:border-white/20 hover:bg-white/5"
                    >
                      Download JSON
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            {settingsSections.map((section) => (
              <SectionCard
                key={section.title}
                title={section.title}
                description={section.detail}
              >
                <p className="text-sm leading-6 text-foreground-muted">
                  This area remains intentionally explicit and infrastructure-oriented so reliability settings do not get buried inside feature-specific screens.
                </p>
              </SectionCard>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
