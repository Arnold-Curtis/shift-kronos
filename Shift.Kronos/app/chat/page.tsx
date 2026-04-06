import { ChatPanel } from "@/components/assistant/chat-panel";
import { requireCurrentUser } from "@/lib/current-user";
import { getConversation, listRecentConversations } from "@/lib/assistant/conversations";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams?: Promise<{ conversationId?: string }>;
}) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : undefined;
  const selectedConversationId = params?.conversationId?.trim();
  const conversations = await listRecentConversations(user.id);
  const selectedConversation = selectedConversationId
    ? await getConversation(user.id, selectedConversationId)
    : null;

  return (
    <div className="pb-4">
      <ChatPanel
        conversations={conversations}
        selectedConversation={selectedConversation}
        selectedConversationId={selectedConversation?.id}
      />
    </div>
  );
}
