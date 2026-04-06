import { z } from "zod";

export const memorySummarySchema = z.object({
  title: z.string().min(1).max(160),
  summary: z.string().min(1),
  salientFacts: z.array(z.string().min(1)).max(8),
  openLoops: z.array(z.string().min(1)).max(6),
  keywords: z.array(z.string().min(1)).max(10),
});

export type MemorySummary = z.infer<typeof memorySummarySchema>;
