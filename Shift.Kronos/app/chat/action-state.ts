export type AssistantActionState = {
  status: "idle" | "success" | "error";
  kind?: string;
  message?: string;
  conversationId?: string;
};

export const INITIAL_ASSISTANT_ACTION_STATE: AssistantActionState = {
  status: "idle",
};
