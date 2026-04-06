import { z } from "zod";

export const storedFileDeleteSchema = z.object({
  id: z.string().trim().min(1),
});

export type SupportedExtractionKind = "text" | "pdf" | "unsupported";
