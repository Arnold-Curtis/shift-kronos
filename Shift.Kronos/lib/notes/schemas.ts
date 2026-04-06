import { z } from "zod";

export const noteSchema = z.object({
  title: z.string().trim().min(1).max(160),
  content: z.string().trim().min(1).max(20000),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  summary: z.string().trim().max(500).optional(),
});

export const noteUpdateSchema = noteSchema.extend({
  id: z.string().trim().min(1),
});

export const noteDeleteSchema = z.object({
  id: z.string().trim().min(1),
});

export type NoteInput = z.infer<typeof noteSchema>;
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>;
