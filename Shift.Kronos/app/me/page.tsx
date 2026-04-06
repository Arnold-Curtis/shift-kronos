import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";
import { AiSettingsForm } from "@/components/settings/ai-settings-form";
import { requireCurrentUser } from "@/lib/current-user";
import { getAssistantProviderOptions, getTranscriptionProviderOptions } from "@/lib/ai/preferences";
import {
  EXPORT_DATASET,
  EXPORT_FORMAT,
} from "@/lib/export/service";
import { getResolvedUserAiSettings } from "@/lib/settings/service";
import {
  User,
  Globe,
  Send,
  FileText,
  FolderOpen,
  Download,
  Bot,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

function buildExportHref(dataset: string, format: string) {
  return `/api/exports?dataset=${encodeURIComponent(dataset)}&format=${encodeURIComponent(format)}`;
}

export default async function MePage() {
  const user = await requireCurrentUser();
  const assistantOptions = getAssistantProviderOptions();
  const transcriptionOptions = getTranscriptionProviderOptions();
  const aiSettings = getResolvedUserAiSettings(user as never);

  return (
    <div className="space-y-6 pb-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-text-primary">Me</h1>
        <p className="mt-0.5 text-sm text-text-secondary">Profile, preferences, and knowledge.</p>
      </header>

      {/* Profile section */}
      <GlassCard>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-muted">
            <User size={22} className="text-accent-light" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              {user.displayName ?? "Set up your name"}
            </h2>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-text-secondary">
              <span className="flex items-center gap-1">
                <Globe size={11} />
                {user.timezone}
              </span>
              <span className="flex items-center gap-1">
                <Send size={11} />
                {user.telegramChatId ? "Telegram linked" : "Not linked"}
              </span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Quick links */}
      <div className="grid gap-2 sm:grid-cols-2">
        <Link href="/me/notes" className="glass-interactive flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-muted">
            <FileText size={16} className="text-accent-light" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">Notes</p>
            <p className="text-xs text-text-tertiary">Your knowledge base</p>
          </div>
          <ChevronRight size={16} className="text-text-tertiary" />
        </Link>

        <Link href="/me/files" className="glass-interactive flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-muted">
            <FolderOpen size={16} className="text-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">Files</p>
            <p className="text-xs text-text-tertiary">Documents and uploads</p>
          </div>
          <ChevronRight size={16} className="text-text-tertiary" />
        </Link>

        <Link href="/reminders" className="glass-interactive flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-muted">
            <FileText size={16} className="text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">All Reminders</p>
            <p className="text-xs text-text-tertiary">Manage and organize</p>
          </div>
          <ChevronRight size={16} className="text-text-tertiary" />
        </Link>

        <a
          href={buildExportHref(EXPORT_DATASET.FULL, EXPORT_FORMAT.JSON)}
          className="glass-interactive flex items-center gap-3 px-4 py-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning-muted">
            <Download size={16} className="text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">Export Backup</p>
            <p className="text-xs text-text-tertiary">Full JSON download</p>
          </div>
          <ChevronRight size={16} className="text-text-tertiary" />
        </a>
      </div>

      {/* AI Settings */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-widest text-text-tertiary">
          <Bot size={12} />
          AI Models
        </h2>
        <GlassCard>
          <AiSettingsForm
            assistantOptions={assistantOptions}
            transcriptionOptions={transcriptionOptions}
            currentAssistantProvider={aiSettings.assistantProvider}
            currentAssistantModel={aiSettings.assistantModel}
            currentTranscriptionProvider={aiSettings.transcriptionProvider}
            currentTranscriptionModel={aiSettings.transcriptionModel}
          />
        </GlassCard>
      </div>
    </div>
  );
}
