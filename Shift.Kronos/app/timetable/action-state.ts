export type TimetableActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const INITIAL_TIMETABLE_ACTION_STATE: TimetableActionState = {
  status: "idle",
};
