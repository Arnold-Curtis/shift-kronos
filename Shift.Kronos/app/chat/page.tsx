import { ChatPanel } from "@/components/assistant/chat-panel";
import { AppShell } from "@/components/layout/app-shell";
import { requireCurrentUser } from "@/lib/current-user";
import { listRecentConversations } from "@/lib/assistant/conversations";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const user = await requireCurrentUser();
  const conversations = await listRecentConversations(user.id);

  return (
    <AppShell
      title="Grounded assistant interaction"
      eyebrow="Phase 7"
      description="The assistant now works with schedule context, retrieval-backed knowledge, and persistent memory continuity through one shared server-side workflow used by web, Telegram, and voice inputs."
      currentPath="/chat"
    >
      <ChatPanel conversations={conversations} />
    </AppShell>
  );
}
