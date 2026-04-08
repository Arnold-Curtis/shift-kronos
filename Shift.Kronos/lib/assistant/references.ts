import { ConversationMessageRole } from "@prisma/client";
import { ASSISTANT_ACTION_TYPE, AssistantRecentActionFact, ResolvedFollowUpTarget } from "@/lib/assistant/types";

type ConversationMessage = {
  role: ConversationMessageRole;
  content: string;
  structuredData: unknown;
};

type ActionEntityType = "REMINDER" | "NOTE" | "TIMETABLE_ENTRY";

const REMINDER_KEYWORDS = [
  "reminder",
  "remind",
  "alarm",
  "alert",
  "wake",
];

const TIMETABLE_KEYWORDS = [
  "class",
  "lecture",
  "timetable",
  "schedule",
  "course",
  "lesson",
  "tutorial",
  "seminar",
  "lab",
];

const NOTE_KEYWORDS = [
  "note",
  "jot",
  "memo",
  "write down",
];

type ActionType = (typeof ASSISTANT_ACTION_TYPE)[keyof typeof ASSISTANT_ACTION_TYPE];

const MUTATION_ACTION_TYPES = new Set<ActionType>([
  ASSISTANT_ACTION_TYPE.CREATE_REMINDER,
  ASSISTANT_ACTION_TYPE.UPDATE_REMINDER,
  ASSISTANT_ACTION_TYPE.CREATE_NOTE,
  ASSISTANT_ACTION_TYPE.UPDATE_NOTE,
  ASSISTANT_ACTION_TYPE.CREATE_TIMETABLE_ENTRY,
  ASSISTANT_ACTION_TYPE.UPDATE_TIMETABLE_ENTRY,
  ASSISTANT_ACTION_TYPE.DELETE_ENTITY,
]);

const ACTION_ENTITY_MAP: Record<ActionType, ActionEntityType | null> = {
  [ASSISTANT_ACTION_TYPE.CREATE_REMINDER]: "REMINDER",
  [ASSISTANT_ACTION_TYPE.UPDATE_REMINDER]: "REMINDER",
  [ASSISTANT_ACTION_TYPE.CREATE_NOTE]: "NOTE",
  [ASSISTANT_ACTION_TYPE.UPDATE_NOTE]: "NOTE",
  [ASSISTANT_ACTION_TYPE.CREATE_TIMETABLE_ENTRY]: "TIMETABLE_ENTRY",
  [ASSISTANT_ACTION_TYPE.UPDATE_TIMETABLE_ENTRY]: "TIMETABLE_ENTRY",
  [ASSISTANT_ACTION_TYPE.DELETE_ENTITY]: null,
  [ASSISTANT_ACTION_TYPE.SEARCH_MEMORY]: null,
  [ASSISTANT_ACTION_TYPE.DISAMBIGUATE]: null,
  [ASSISTANT_ACTION_TYPE.ANSWER_QUESTION]: null,
  [ASSISTANT_ACTION_TYPE.CLARIFY_MISSING_FIELDS]: null,
  [ASSISTANT_ACTION_TYPE.REJECT_REQUEST]: null,
};

function extractEntityFromStructuredData(data: Record<string, unknown>, actionType: string): {
  entityId: string;
  entityTitle: string;
  localTimeDescription: string;
} | null {
  if (actionType === ASSISTANT_ACTION_TYPE.CREATE_REMINDER) {
    const reminder = data.reminder as Record<string, unknown> | undefined;
    if (!reminder?.title) return null;
    const dueAt = typeof reminder.dueAt === "string" ? reminder.dueAt : null;
    return {
      entityId: (data as Record<string, unknown>).reminderId as string ?? "",
      entityTitle: String(reminder.title),
      localTimeDescription: dueAt ? `due ${dueAt}` : "no due time",
    };
  }

  if (actionType === ASSISTANT_ACTION_TYPE.UPDATE_REMINDER) {
    const reminderId = typeof data.reminderId === "string" ? data.reminderId : "";
    const updates = data.updates as Record<string, unknown> | undefined;
    const title = typeof updates?.title === "string" ? updates.title : "";
    const dueAt = typeof updates?.dueAt === "string" ? updates.dueAt : "";
    return {
      entityId: reminderId,
      entityTitle: title || "reminder",
      localTimeDescription: dueAt ? `due ${dueAt}` : "",
    };
  }

  if (actionType === ASSISTANT_ACTION_TYPE.CREATE_NOTE) {
    const note = data.note as Record<string, unknown> | undefined;
    if (!note?.title) return null;
    return {
      entityId: "",
      entityTitle: String(note.title),
      localTimeDescription: "",
    };
  }

  if (actionType === ASSISTANT_ACTION_TYPE.UPDATE_NOTE) {
    const noteId = typeof data.noteId === "string" ? data.noteId : "";
    const updates = data.updates as Record<string, unknown> | undefined;
    const title = typeof updates?.title === "string" ? updates.title : "";
    return {
      entityId: noteId,
      entityTitle: title || "note",
      localTimeDescription: "",
    };
  }

  if (actionType === ASSISTANT_ACTION_TYPE.CREATE_TIMETABLE_ENTRY) {
    const entry = data.timetableEntry as Record<string, unknown> | undefined;
    if (!entry?.subject) return null;
    return {
      entityId: (data as Record<string, unknown>).entryId as string ?? "",
      entityTitle: String(entry.subject),
      localTimeDescription: `${entry.startTime ?? ""}-${entry.endTime ?? ""}`,
    };
  }

  if (actionType === ASSISTANT_ACTION_TYPE.UPDATE_TIMETABLE_ENTRY) {
    const entryId = typeof data.entryId === "string" ? data.entryId : "";
    const updates = data.updates as Record<string, unknown> | undefined;
    const subject = typeof updates?.subject === "string" ? updates.subject : "";
    return {
      entityId: entryId,
      entityTitle: subject || "timetable entry",
      localTimeDescription: "",
    };
  }

  if (actionType === ASSISTANT_ACTION_TYPE.DELETE_ENTITY) {
    const entityType = typeof data.entityType === "string" ? data.entityType : "";
    const entityId = typeof data.entityId === "string" ? data.entityId : "";
    return {
      entityId,
      entityTitle: `${entityType} ${entityId}`,
      localTimeDescription: "",
    };
  }

  return null;
}

export function extractRecentActions(
  recentMessages: ConversationMessage[],
  _timezone: string,
): AssistantRecentActionFact[] {
  const actions: AssistantRecentActionFact[] = [];
  const totalMessages = recentMessages.length;

  for (let i = 0; i < recentMessages.length; i++) {
    const message = recentMessages[i];

    if (message.role !== ConversationMessageRole.ASSISTANT) continue;
    if (!message.structuredData || typeof message.structuredData !== "object") continue;

    const data = message.structuredData as Record<string, unknown>;
    const actionType = typeof data.type === "string" ? data.type : "";

    if (!MUTATION_ACTION_TYPES.has(actionType as ActionType)) continue;

    let entityType = ACTION_ENTITY_MAP[actionType as ActionType];

    if (actionType === ASSISTANT_ACTION_TYPE.DELETE_ENTITY) {
      const rawType = typeof data.entityType === "string" ? data.entityType : "";
      if (rawType === "REMINDER" || rawType === "NOTE" || rawType === "TIMETABLE_ENTRY") {
        entityType = rawType;
      } else {
        continue;
      }
    }

    if (!entityType) continue;

    const extracted = extractEntityFromStructuredData(data, actionType);
    if (!extracted) continue;

    actions.push({
      actionType,
      entityType,
      entityId: extracted.entityId,
      entityTitle: extracted.entityTitle,
      localTimeDescription: extracted.localTimeDescription,
      turnIndex: totalMessages - i,
    });
  }

  return actions;
}

type DomainSignal = "REMINDER" | "NOTE" | "TIMETABLE_ENTRY" | null;

function detectDomainSignal(input: string): DomainSignal {
  const lower = input.toLowerCase();

  for (const keyword of REMINDER_KEYWORDS) {
    if (lower.includes(keyword)) return "REMINDER";
  }

  for (const keyword of TIMETABLE_KEYWORDS) {
    if (lower.includes(keyword)) return "TIMETABLE_ENTRY";
  }

  for (const keyword of NOTE_KEYWORDS) {
    if (lower.includes(keyword)) return "NOTE";
  }

  return null;
}

function detectCorrectionSignal(input: string): DomainSignal | null {
  const lower = input.toLowerCase();

  if (/\bno\b.*\breminder\b/i.test(lower) || /\bnot\b.*\bclass\b.*\breminder\b/i.test(lower) || /\bi meant\b.*\breminder\b/i.test(lower)) {
    return "REMINDER";
  }

  if (/\bno\b.*\bclass\b/i.test(lower) || /\bnot\b.*\breminder\b.*\bclass\b/i.test(lower) || /\bi meant\b.*\bclass\b/i.test(lower)) {
    return "TIMETABLE_ENTRY";
  }

  if (/\bno\b.*\bnote\b/i.test(lower) || /\bi meant\b.*\bnote\b/i.test(lower)) {
    return "NOTE";
  }

  return null;
}

function hasPronounReference(input: string): boolean {
  return /\b(it|that|this)\b/i.test(input.trim());
}

function looksLikeUpdateIntent(input: string): boolean {
  const lower = input.trim().toLowerCase();
  return (
    /\b(change|update|move|shift|reschedule|modify|edit|adjust|set)\b/i.test(lower) ||
    /\bto\s+\d/i.test(lower) ||
    /^\s*(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)\s*$/i.test(lower.trim())
  );
}

function looksLikeDeleteIntent(input: string): boolean {
  const lower = input.trim().toLowerCase();
  return /\b(delete|remove|cancel|drop)\b/i.test(lower);
}

function findLastMutatedEntityByDomain(
  actions: AssistantRecentActionFact[],
  domain: ActionEntityType,
): AssistantRecentActionFact | null {
  for (const action of actions) {
    if (action.entityType === domain) return action;
  }
  return null;
}

function findMostRecentMutatedEntity(
  actions: AssistantRecentActionFact[],
): AssistantRecentActionFact | null {
  return actions[0] ?? null;
}

export function resolveFollowUpTarget(
  input: string,
  recentActions: AssistantRecentActionFact[],
  activeReminders: Array<{ id: string; title: string }>,
  timetableEntries: Array<{ id: string; subject: string }>,
): ResolvedFollowUpTarget | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const isUpdate = looksLikeUpdateIntent(trimmed);
  const isDelete = looksLikeDeleteIntent(trimmed);

  if (!isUpdate && !isDelete && !hasPronounReference(trimmed)) {
    return null;
  }

  const correctionDomain = detectCorrectionSignal(trimmed);
  const explicitDomain = detectDomainSignal(trimmed);

  if (correctionDomain) {
    const entity = findLastMutatedEntityByDomain(recentActions, correctionDomain);
    if (entity) {
      return buildTarget(entity, isDelete);
    }

    if (correctionDomain === "REMINDER" && activeReminders.length > 0) {
      return {
        entityType: "REMINDER",
        entityId: activeReminders[0].id,
        entityTitle: activeReminders[0].title,
        suggestedAction: isDelete ? "DELETE_ENTITY" : "UPDATE_REMINDER",
      };
    }

    if (correctionDomain === "TIMETABLE_ENTRY" && timetableEntries.length > 0) {
      return {
        entityType: "TIMETABLE_ENTRY",
        entityId: timetableEntries[0].id,
        entityTitle: timetableEntries[0].subject,
        suggestedAction: isDelete ? "DELETE_ENTITY" : "UPDATE_TIMETABLE_ENTRY",
      };
    }

    return null;
  }

  if (explicitDomain) {
    const entity = findLastMutatedEntityByDomain(recentActions, explicitDomain);
    if (entity) {
      return buildTarget(entity, isDelete);
    }

    if (explicitDomain === "REMINDER" && activeReminders.length > 0) {
      return {
        entityType: "REMINDER",
        entityId: activeReminders[0].id,
        entityTitle: activeReminders[0].title,
        suggestedAction: isDelete ? "DELETE_ENTITY" : "UPDATE_REMINDER",
      };
    }

    if (explicitDomain === "TIMETABLE_ENTRY" && timetableEntries.length > 0) {
      return {
        entityType: "TIMETABLE_ENTRY",
        entityId: timetableEntries[0].id,
        entityTitle: timetableEntries[0].subject,
        suggestedAction: isDelete ? "DELETE_ENTITY" : "UPDATE_TIMETABLE_ENTRY",
      };
    }

    if (explicitDomain === "NOTE") {
      return null;
    }

    return null;
  }

  if (hasPronounReference(trimmed) || isUpdate || isDelete) {
    const lastEntity = findMostRecentMutatedEntity(recentActions);
    if (lastEntity) {
      return buildTarget(lastEntity, isDelete);
    }
  }

  return null;
}

function buildTarget(
  entity: AssistantRecentActionFact,
  isDelete: boolean,
): ResolvedFollowUpTarget {
  const actionMap: Record<ActionEntityType, "UPDATE_REMINDER" | "UPDATE_NOTE" | "UPDATE_TIMETABLE_ENTRY" | "DELETE_ENTITY"> = {
    REMINDER: isDelete ? "DELETE_ENTITY" : "UPDATE_REMINDER",
    NOTE: isDelete ? "DELETE_ENTITY" : "UPDATE_NOTE",
    TIMETABLE_ENTRY: isDelete ? "DELETE_ENTITY" : "UPDATE_TIMETABLE_ENTRY",
  };

  return {
    entityType: entity.entityType,
    entityId: entity.entityId,
    entityTitle: entity.entityTitle,
    suggestedAction: actionMap[entity.entityType],
  };
}

export function buildFollowUpContextLine(
  input: string,
  recentActions: AssistantRecentActionFact[],
  target: ResolvedFollowUpTarget | null,
): string | null {
  if (!target) return null;

  const lower = input.toLowerCase();

  if (
    lower.includes("when is") ||
    lower.includes("when was") ||
    (lower.includes("when") && lower.includes("again"))
  ) {
    return `What is the schedule for ${target.entityType.toLowerCase()} "${target.entityTitle}"?`;
  }

  return null;
}
