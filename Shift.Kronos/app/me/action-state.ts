export type MeActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const INITIAL_ME_ACTION_STATE: MeActionState = {
  status: "idle",
};
