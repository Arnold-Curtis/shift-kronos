import { ConversationMessageRole, ReminderPriority, ReminderType, RecurrenceFrequency, RetrievalSourceType } from "@prisma/client";

export const ASSISTANT_INPUT_SOURCE = {
  WEB_CAPTURE: "web-capture",
  WEB_CHAT: "web-chat",
  TELEGRAM: "telegram",
  VOICE: "voice",
} as const;

export type AssistantInputSource =
  (typeof ASSISTANT_INPUT_SOURCE)[keyof typeof ASSISTANT_INPUT_SOURCE];

export const ASSISTANT_RESULT_KIND = {
  EXECUTED: "executed",
  ANSWERED: "answered",
  CLARIFICATION: "clarification",
  REJECTED: "rejected",
} as const;

export type AssistantResultKind =
  (typeof ASSISTANT_RESULT_KIND)[keyof typeof ASSISTANT_RESULT_KIND];

export const ASSISTANT_ACTION_TYPE = {
  CREATE_REMINDER: "create_reminder",
  ANSWER_QUESTION: "answer_question",
  CLARIFY_MISSING_FIELDS: "clarify_missing_fields",
  REJECT_REQUEST: "reject_request",
} as const;

export type AssistantActionType =
  (typeof ASSISTANT_ACTION_TYPE)[keyof typeof ASSISTANT_ACTION_TYPE];

export type AssistantReminderDraft = {
  title: string;
  description?: string;
  type: ReminderType;
  priority: ReminderPriority;
  category?: string;
  tags: string[];
  dueAt?: Date;
  recurrence?: {
    frequency: RecurrenceFrequency;
    interval: number;
    daysOfWeek: number[];
    endAt?: Date;
  };
};

export type AssistantQuestionAnswer = {
  summary: string;
  evidence: string[];
};

export type AssistantClarification = {
  missingFields: string[];
  question: string;
};

export type AssistantAction =
  | {
      type: typeof ASSISTANT_ACTION_TYPE.CREATE_REMINDER;
      reminder: AssistantReminderDraft;
      confidence: "high" | "medium";
    }
  | {
      type: typeof ASSISTANT_ACTION_TYPE.ANSWER_QUESTION;
      answer: AssistantQuestionAnswer;
    }
  | {
      type: typeof ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS;
      clarification: AssistantClarification;
    }
  | {
      type: typeof ASSISTANT_ACTION_TYPE.REJECT_REQUEST;
      reason: string;
    };

export type AssistantReminderContext = {
  id: string;
  title: string;
  dueAt: Date | null;
  priority: ReminderPriority;
  type: ReminderType;
  category: string | null;
};

export type AssistantTimetableContext = {
  entryId: string;
  subject: string;
  startsAt: Date;
  location: string | null;
};

export type AssistantContext = {
  timezone: string;
  activeReminders: AssistantReminderContext[];
  upcomingClasses: AssistantTimetableContext[];
  knowledgeHighlights: {
    sourceType: RetrievalSourceType;
    sourceId: string;
    sourceTitle: string;
    content: string;
    score: number;
  }[];
  memoryHighlights: {
    artifactId: string;
    summaryLevel: number;
    title: string | null;
    content: string;
    score: number;
    sourceType: RetrievalSourceType;
  }[];
  recentConversation: {
    id: string;
    role: ConversationMessageRole;
    content: string;
    createdAt: Date;
    tokenEstimate: number;
  }[];
  now: Date;
};

export type AssistantWorkflowInput = {
  userId: string;
  input: string;
  source: AssistantInputSource;
  now?: Date;
  conversationId?: string;
};

export type AssistantWorkflowResult =
  | {
      kind: typeof ASSISTANT_RESULT_KIND.EXECUTED;
      action: Extract<AssistantAction, { type: "create_reminder" }>;
      message: string;
      conversationId?: string;
    }
  | {
      kind: typeof ASSISTANT_RESULT_KIND.ANSWERED;
      action: Extract<AssistantAction, { type: "answer_question" }>;
      message: string;
      conversationId?: string;
    }
  | {
      kind: typeof ASSISTANT_RESULT_KIND.CLARIFICATION;
      action: Extract<AssistantAction, { type: "clarify_missing_fields" }>;
      message: string;
      conversationId?: string;
    }
  | {
      kind: typeof ASSISTANT_RESULT_KIND.REJECTED;
      action: Extract<AssistantAction, { type: "reject_request" }>;
      message: string;
      conversationId?: string;
    };

export type ConversationMessageView = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  createdAt: Date;
};

export type ConversationView = {
  id: string;
  title: string | null;
  source: string;
  updatedAt: Date;
  messages: ConversationMessageView[];
};
