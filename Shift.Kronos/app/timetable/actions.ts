"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireCurrentUser } from "@/lib/current-user";
import { createTimetableEntry, importTimetableEntries } from "@/lib/timetable/service";
import {
  TimetableActionState,
} from "@/app/timetable/action-state";

function getErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "The timetable input is invalid.";
  }

  if (error instanceof SyntaxError) {
    return "The timetable JSON could not be parsed. Check for missing quotes, commas, or brackets.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while saving your timetable.";
}

export async function createTimetableEntryAction(
  _previousState: TimetableActionState,
  formData: FormData,
): Promise<TimetableActionState> {
  void _previousState;

  try {
    const user = await requireCurrentUser();

    await createTimetableEntry(user.id, {
      subject: String(formData.get("subject") ?? ""),
      location: String(formData.get("location") ?? ""),
      lecturer: String(formData.get("lecturer") ?? ""),
      dayOfWeek: Number(formData.get("dayOfWeek") ?? 1),
      startTime: String(formData.get("startTime") ?? ""),
      endTime: String(formData.get("endTime") ?? ""),
      semesterStart: new Date(String(formData.get("semesterStart") ?? "")),
      semesterEnd: new Date(String(formData.get("semesterEnd") ?? "")),
      reminderLeadMinutes: Number(formData.get("reminderLeadMinutes") ?? 30),
    });

    revalidatePath("/");
    revalidatePath("/calendar");
    revalidatePath("/me");
    revalidatePath("/timetable");

    return {
      status: "success",
      message: "Class entry saved to your timetable.",
    };
  } catch (error) {
    return {
      status: "error",
      message: getErrorMessage(error),
    };
  }
}

export async function importTimetableEntriesAction(
  _previousState: TimetableActionState,
  formData: FormData,
): Promise<TimetableActionState> {
  void _previousState;

  try {
    const user = await requireCurrentUser();
    const payload = String(formData.get("payload") ?? "");
    const mode = String(formData.get("mode") ?? "append");
    const parsed = JSON.parse(payload) as { entries: unknown[] };

    const result = await importTimetableEntries(user.id, parsed as never, {
      mode: mode === "replace-semester" ? "replace-semester" : "append",
    });

    revalidatePath("/");
    revalidatePath("/calendar");
    revalidatePath("/me");
    revalidatePath("/timetable");

    return {
      status: "success",
      message:
        result.mode === "replace-semester"
          ? `Imported ${result.importedCount} timetable entr${result.importedCount === 1 ? "y" : "ies"} and replaced ${result.replacedCount} existing entr${result.replacedCount === 1 ? "y" : "ies"} in the imported semester range.`
          : `Imported ${result.importedCount} timetable entr${result.importedCount === 1 ? "y" : "ies"}.`,
    };
  } catch (error) {
    return {
      status: "error",
      message: getErrorMessage(error),
    };
  }
}
