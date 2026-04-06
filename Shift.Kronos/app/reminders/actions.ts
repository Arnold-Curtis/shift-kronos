"use server";

import { revalidatePath } from "next/cache";
import { ReminderType } from "@prisma/client";
import { requireCurrentUser } from "@/lib/current-user";
import { createReminder, updateReminderStatus } from "@/lib/reminders/service";

function parseTags(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  return new Date(value);
}

function parseDaysOfWeek(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((day) => Number(day.trim()))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);
}

export async function createReminderAction(formData: FormData) {
  const user = await requireCurrentUser();
  const type = formData.get("type") as ReminderType;
  const recurrenceFrequency = formData.get("recurrenceFrequency");
  const recurrenceInterval = formData.get("recurrenceInterval");

  await createReminder(user.id, {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    type,
    priority: formData.get("priority") === "HIGH" ? "HIGH" : formData.get("priority") === "LOW" ? "LOW" : "MEDIUM",
    category: String(formData.get("category") ?? ""),
    tags: parseTags(formData.get("tags")),
    dueAt: parseDate(formData.get("dueAt")),
    recurrence:
      type === ReminderType.RECURRING || type === ReminderType.HABIT
        ? {
            frequency:
              recurrenceFrequency === "MONTHLY"
                ? "MONTHLY"
                : recurrenceFrequency === "WEEKLY"
                  ? "WEEKLY"
                  : "DAILY",
            interval: Number(recurrenceInterval ?? 1),
            daysOfWeek: parseDaysOfWeek(formData.get("recurrenceDays")),
            endAt: parseDate(formData.get("recurrenceEndAt")),
          }
        : undefined,
  });

  revalidatePath("/");
  revalidatePath("/reminders");
}

export async function completeReminderAction(formData: FormData) {
  const user = await requireCurrentUser();

  await updateReminderStatus(user.id, {
    id: String(formData.get("id") ?? ""),
    status: "COMPLETED",
  });

  revalidatePath("/");
  revalidatePath("/reminders");
}

export async function reactivateReminderAction(formData: FormData) {
  const user = await requireCurrentUser();

  await updateReminderStatus(user.id, {
    id: String(formData.get("id") ?? ""),
    status: "ACTIVE",
  });

  revalidatePath("/");
  revalidatePath("/reminders");
}
