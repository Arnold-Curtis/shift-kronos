import { ConversationMessageRole } from "@prisma/client";
import { db } from "@/lib/db";
import { ConversationView } from "@/lib/assistant/types";
import { estimateTokenCount } from "@/lib/memory/tokens";

function mapConversationView(conversation: {
  id: string;
  title: string | null;
  source: string;
  updatedAt: Date;
  messages: Array<{
    id: string;
    role: ConversationMessageRole;
    content: string;
    createdAt: Date;
  }>;
}): ConversationView {
  return {
    id: conversation.id,
    title: conversation.title,
    source: conversation.source,
    updatedAt: conversation.updatedAt,
    messages: conversation.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
  };
}

export async function createConversation(userId: string, source: string, title?: string) {
  return db.conversation.create({
    data: {
      userId,
      source,
      title: title?.trim() ? title.trim().slice(0, 160) : null,
    },
  });
}

export async function ensureConversation(userId: string, source: string, conversationId?: string) {
  if (conversationId) {
    const existing = await db.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (existing) {
      return existing;
    }
  }

  const created = await createConversation(userId, source);

  await db.conversation.update({
    where: {
      id: created.id,
    },
    data: {
      title: `${source} conversation`,
    },
  });

  return created;
}

export async function appendConversationMessage(
  conversationId: string,
  role: ConversationMessageRole,
  content: string,
  structuredData?: unknown,
) {
  await db.conversation.update({
    where: {
      id: conversationId,
    },
    data: {
      latestMessageAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return db.conversationMessage.create({
    data: {
      conversationId,
      role,
      content,
      tokenEstimate: estimateTokenCount(content),
      structuredData: structuredData ? JSON.parse(JSON.stringify(structuredData)) : undefined,
    },
  });
}

export async function listRecentConversations(userId: string) {
  const conversations = await db.conversation.findMany({
    where: {
      userId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 8,
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        take: 12,
      },
    },
  });

  return conversations.map(mapConversationView);
}

export async function getConversation(userId: string, conversationId: string) {
  const conversation = await db.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return conversation ? mapConversationView(conversation) : null;
}
