import { AssistantAction, ASSISTANT_ACTION_TYPE } from "./types";

export function requiresConfirmation(action: AssistantAction): boolean {
  switch (action.type) {
    case ASSISTANT_ACTION_TYPE.DELETE_ENTITY:
      return action.requiresConfirmation ?? true;

    case ASSISTANT_ACTION_TYPE.UPDATE_TIMETABLE_ENTRY:
      return !!action.updates?.subject;

    default:
      return false;
  }
}

export function generateConfirmationMessage(action: AssistantAction): string {
  switch (action.type) {
    case ASSISTANT_ACTION_TYPE.DELETE_ENTITY:
      return `Are you sure you want to delete this ${action.entityType.toLowerCase()}? This cannot be undone.`;

    case ASSISTANT_ACTION_TYPE.UPDATE_TIMETABLE_ENTRY:
      return `Confirm update to timetable entry?`;

    default:
      return "Please confirm this action.";
  }
}

export async function handleConfirmationFlow(
  action: AssistantAction,
): Promise<{ confirmed: boolean; result?: unknown }> {
  return {
    confirmed: false,
    result: {
      message: generateConfirmationMessage(action),
      awaitingConfirmation: true,
    },
  };
}
