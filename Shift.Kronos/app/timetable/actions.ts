"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/current-user";
import { createTimetableEntry, importTimetableEntries } from "@/lib/timetable/service";

export async function createTimetableEntryAction(formData: FormData) {
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
  revalidatePath("/timetable");
}

export async function importTimetableEntriesAction(formData: FormData) {
  const user = await requireCurrentUser();
  const payload = String(formData.get("payload") ?? "");
  const parsed = JSON.parse(payload) as { entries: unknown[] };

  await importTimetableEntries(user.id, parsed as never);

  revalidatePath("/");
  revalidatePath("/timetable");
}
