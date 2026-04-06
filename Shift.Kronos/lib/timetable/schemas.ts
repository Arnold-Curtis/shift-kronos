import { z } from "zod";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/);

export const timetableEntrySchema = z
  .object({
    subject: z.string().trim().min(1).max(160),
    location: z.string().trim().max(160).optional().or(z.literal("")),
    lecturer: z.string().trim().max(160).optional().or(z.literal("")),
    dayOfWeek: z.number().int().min(1).max(7),
    startTime: timeSchema,
    endTime: timeSchema,
    semesterStart: z.coerce.date(),
    semesterEnd: z.coerce.date(),
    reminderLeadMinutes: z.number().int().min(0).max(1440).default(30),
  })
  .superRefine((value, context) => {
    if (value.startTime >= value.endTime) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Class start time must be earlier than end time.",
        path: ["endTime"],
      });
    }

    if (value.semesterStart > value.semesterEnd) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Semester start must be on or before semester end.",
        path: ["semesterEnd"],
      });
    }
  });

export const timetableImportSchema = z.object({
  entries: z.array(timetableEntrySchema).min(1),
});

export type TimetableEntryInput = z.infer<typeof timetableEntrySchema>;
export type TimetableImportInput = z.infer<typeof timetableImportSchema>;
