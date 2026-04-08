import {
  ConversationMessageRole,
  ReminderPriority,
  ReminderType,
  RecurrenceFrequency,
  RetrievalSourceType,
} from "@prisma/client";

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
  DISAMBIGUATION: "disambiguation",
  CONFIRMATION: "confirmation",
} as const;

export type AssistantResultKind =
  (typeof ASSISTANT_RESULT_KIND)[keyof typeof ASSISTANT_RESULT_KIND];

export const ASSISTANT_ACTION_TYPE = {
  CREATE_REMINDER: "create_reminder",
  CREATE_NOTE: "create_note",
  CREATE_TIMETABLE_ENTRY: "create_timetable_entry",
  UPDATE_TIMETABLE_ENTRY: "update_timetable_entry",
  DELETE_ENTITY: "delete_entity",
  SEARCH_MEMORY: "search_memory",
  DISAMBIGUATE: "disambiguate",
  ANSWER_QUESTION: "answer_question",
  CLARIFY_MISSING_FIELDS: "clarify_missing_fields",
  REJECT_REQUEST: "reject_request",
} as const;

export type AssistantActionType =
  (typeof ASSISTANT_ACTION_TYPE)[keyof typeof ASSISTANT_ACTION_TYPE];

export type QueryTarget =
  | "SCHEDULE"
  | "MEMORY"
  | "REMINDERS"
  | "NOTES"
  | "ALL";

export type EntityType = "REMINDER" | "NOTE" | "TIMETABLE_ENTRY" | "CONVERSATION";

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

export type AssistantNoteDraft = {
  title: string;
  content: string;
  tags?: string[];
};

export type AssistantQuestionAnswer = {
  summary: string;
  evidence: string[];
  sources?: Array<{
    type: string;
    id: string;
    title: string;
  }>;
};

export type AssistantTimetableDraft = {
  subject: string;
  location?: string;
  lecturer?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  semesterStart?: Date;
  semesterEnd?: Date;
  reminderLeadMinutes?: number;
};

export type AssistantTimetableUpdate = {
  subject?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  lecturer?: string;
};

export type AssistantClarification = {
  missingFields: string[];
  question: string;
};

export type AssistantTimeContext = {
  date?: Date;
  dayOfWeek?: number;
  timeRange?: {
    start: string;
    end: string;
  };
};

export type AssistantDisambiguationOption = {
  label: string;
  action: AssistantAction;
  description: string;
};

export type AssistantAction =
  | {
      type: typeof ASSISTANT_ACTION_TYPE.CREATE_REMINDER;
      reminder: AssistantReminderDraft;
      confidence: "high" | "medium" | "low";
    }
  | {
      type: typeof ASSISTANT_ACTION_TYPE.CREATE_NOTE;
      note: AssistantNoteDraft;
      alsoCreateMemory: boolean;
      confidence: "high" | "medium" | "low";
    }
  | {
      type: typeof ASSISTANT_ACTION_TYPE.CREATE_TIMETABLE_ENTRY;
      timetableEntry: AssistantTimetableDraft;
      confidence: "high" | "medium" | "low";
    }
  | {
      type: typeof ASSISTANT_ACTION_TYPE.UPDATE_TIMETABLE_ENTRY;
      entryId: string;
      updates: AssistantTimetableUpdate;
      confidence: "high" | "medium" | "low";
    }
  | {
      type: typeof ASSISTANT_ACTION_TYPE.DELETE_ENTITY;
      entityType: EntityType;
      entityId: string;
      requiresConfirmation: boolean;
      confidence: "high" | "medium" | "low";
    }
  | {
      type: typeof ASSISTANT_ACTION_TYPE.SEARCH_MEMORY;
      query: string;
      target: QueryTarget;
      timeContext?: AssistantTimeContext;
      answer?: AssistantQuestionAnswer;
    }
  | {
      type: typeof ASSISTANT_ACTION_TYPE.DISAMBIGUATE;
      options: AssistantDisambiguationOption[];
      defaultOption: number;
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

export type AssistantDerivedTimeFact = {
  utc: string;
  timezone: string;
  localDateTime: string;
  localDate: string;
  localTime: string;
  weekdayLocal: string;
  isToday: boolean;
  isTomorrow: boolean;
  isPast: boolean;
  isUpcoming: boolean;
  minutesFromNow: number;
};

export type AssistantUpcomingClassFact = {
  entryId: string;
  subject: string;
  location: string | null;
  timing: AssistantDerivedTimeFact;
};

export type AssistantReminderFact = {
  id: string;
  title: string;
  priority: ReminderPriority;
  type: ReminderType;
  category: string | null;
  timing: AssistantDerivedTimeFact | null;
};

export type AssistantHighIntegrityFacts = {
  currentTime: AssistantDerivedTimeFact;
  nextClass: AssistantUpcomingClassFact | null;
  upcomingClasses: AssistantUpcomingClassFact[];
  nextReminder: AssistantReminderFact | null;
  activeReminders: AssistantReminderFact[];
};

export type AssistantTimetableEntryContext = {
  id: string;
  subject: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location?: string | null;
  semesterStart?: Date | null;
  semesterEnd?: Date | null;
};

export type AssistantMemoryContextItem = {
  id: string;
  title: string | null;
  content: string;
  salientFacts: string[];
  keywords: string[];
  entityType: string | null;
  relatedEntityId: string | null;
  createdAt: Date;
};

export type SemesterContext = {
  semesterStart?: Date;
  semesterEnd?: Date;
};

export type AssistantContext = {
  timezone: string;
  activeReminders: AssistantReminderContext[];
  upcomingClasses: AssistantTimetableContext[];
  highIntegrityFacts: AssistantHighIntegrityFacts;
  timetableEntries?: AssistantTimetableEntryContext[];
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
  recentMemoryArtifacts?: AssistantMemoryContextItem[];
  recentConversation: {
    id: string;
    role: ConversationMessageRole;
    content: string;
    createdAt: Date;
    tokenEstimate: number;
  }[];
  semesterContext?: SemesterContext;
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
      action: Extract<AssistantAction, { type: "create_reminder" | "create_note" | "create_timetable_entry" | "update_timetable_entry" | "delete_entity" }>;
      message: string;
      conversationId?: string;
    }
  | {
      kind: typeof ASSISTANT_RESULT_KIND.ANSWERED;
      action: Extract<AssistantAction, { type: "answer_question" | "search_memory" }>;
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
      kind: typeof ASSISTANT_RESULT_KIND.DISAMBIGUATION;
      action: Extract<AssistantAction, { type: "disambiguate" }>;
      message: string;
      conversationId?: string;
    }
  | {
      kind: typeof ASSISTANT_RESULT_KIND.CONFIRMATION;
      action: AssistantAction;
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

export type ActionResult = {
  success: boolean;
  message: string;
  data?: unknown;
  awaitingConfirmation?: boolean;
  pendingAction?: AssistantAction;
  missingFields?: string[];
  options?: AssistantDisambiguationOption[];
  defaultOption?: number;
};
