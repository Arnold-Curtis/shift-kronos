import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"),
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),
  BLOB_READ_WRITE_TOKEN: z.string().min(1, "BLOB_READ_WRITE_TOKEN is required"),
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
  TELEGRAM_CHAT_ID: z.string().min(1, "TELEGRAM_CHAT_ID must not be empty").optional(),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  OPENROUTER_BASE_URL: z.string().url("OPENROUTER_BASE_URL must be a valid URL").default("https://openrouter.ai/api/v1"),
  OPENROUTER_HTTP_REFERER: z.string().url("OPENROUTER_HTTP_REFERER must be a valid URL").optional(),
  OPENROUTER_TITLE: z.string().trim().min(1, "OPENROUTER_TITLE must not be empty").optional(),
  PHASE4_FAKE_AI: z.enum(["0", "1"]).optional(),
  PHASE5_EMBEDDING_MODEL: z.string().min(1, "PHASE5_EMBEDDING_MODEL is required").default("text-embedding-004"),
  PHASE5_EMBEDDING_DIMENSIONS: z.coerce.number().int().min(1).default(768),
  PHASE5_FAKE_EMBEDDINGS: z.enum(["0", "1"]).optional(),
  PHASE5_FAKE_PDF_EXTRACTION: z.enum(["0", "1"]).optional(),
  PHASE6_CONTEXT_TOKEN_BUDGET: z.coerce.number().int().min(256).default(2400),
  PHASE6_RECENT_MESSAGE_LIMIT: z.coerce.number().int().min(2).default(6),
  PHASE6_SUMMARY_MIN_MESSAGES: z.coerce.number().int().min(2).default(6),
  PHASE6_SUMMARY_TRIGGER_TOKENS: z.coerce.number().int().min(50).default(180),
  PHASE6_FAKE_SUMMARIES: z.enum(["0", "1"]).optional(),
  PHASE7_CRON_SECRET: z.string().min(1, "PHASE7_CRON_SECRET is required"),
  PHASE7_TELEGRAM_WEBHOOK_SECRET: z.string().min(1, "PHASE7_TELEGRAM_WEBHOOK_SECRET is required"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

type EnvSource = Record<string, string | undefined>;

export function parseServerEnv(env: EnvSource): ServerEnv {
  return serverEnvSchema.parse({
    DATABASE_URL: env.DATABASE_URL,
    CLERK_SECRET_KEY: env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
    BLOB_READ_WRITE_TOKEN: env.BLOB_READ_WRITE_TOKEN,
    TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: env.TELEGRAM_CHAT_ID,
    GEMINI_API_KEY: env.GEMINI_API_KEY,
    GROQ_API_KEY: env.GROQ_API_KEY,
    OPENROUTER_API_KEY: env.OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL: env.OPENROUTER_BASE_URL,
    OPENROUTER_HTTP_REFERER: env.OPENROUTER_HTTP_REFERER,
    OPENROUTER_TITLE: env.OPENROUTER_TITLE,
    PHASE4_FAKE_AI: env.PHASE4_FAKE_AI,
    PHASE5_EMBEDDING_MODEL: env.PHASE5_EMBEDDING_MODEL,
    PHASE5_EMBEDDING_DIMENSIONS: env.PHASE5_EMBEDDING_DIMENSIONS,
    PHASE5_FAKE_EMBEDDINGS: env.PHASE5_FAKE_EMBEDDINGS,
    PHASE5_FAKE_PDF_EXTRACTION: env.PHASE5_FAKE_PDF_EXTRACTION,
    PHASE6_CONTEXT_TOKEN_BUDGET: env.PHASE6_CONTEXT_TOKEN_BUDGET,
    PHASE6_RECENT_MESSAGE_LIMIT: env.PHASE6_RECENT_MESSAGE_LIMIT,
    PHASE6_SUMMARY_MIN_MESSAGES: env.PHASE6_SUMMARY_MIN_MESSAGES,
    PHASE6_SUMMARY_TRIGGER_TOKENS: env.PHASE6_SUMMARY_TRIGGER_TOKENS,
    PHASE6_FAKE_SUMMARIES: env.PHASE6_FAKE_SUMMARIES,
    PHASE7_CRON_SECRET: env.PHASE7_CRON_SECRET,
    PHASE7_TELEGRAM_WEBHOOK_SECRET: env.PHASE7_TELEGRAM_WEBHOOK_SECRET,
  });
}

let cachedEnv: ServerEnv | null = null;

export function getServerEnv() {
  if (!cachedEnv) {
    cachedEnv = parseServerEnv(process.env as EnvSource);
  }

  return cachedEnv;
}
