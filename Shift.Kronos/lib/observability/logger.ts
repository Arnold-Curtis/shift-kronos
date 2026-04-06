export const LOG_LEVEL = {
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
} as const;

export type LogLevel = (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL];

type LogContext = Record<string, unknown>;

function sanitizeContextValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeContextValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        sanitizeContextValue(nestedValue),
      ]),
    );
  }

  return value;
}

function writeStructuredLog(level: LogLevel, event: string, context: LogContext = {}) {
  const sanitizedContext = sanitizeContextValue(context);
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    context: sanitizedContext,
  };

  const serialized = JSON.stringify(payload);

  if (level === LOG_LEVEL.ERROR) {
    console.error(serialized);
    return;
  }

  if (level === LOG_LEVEL.WARN) {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

export function logInfo(event: string, context: LogContext = {}) {
  writeStructuredLog(LOG_LEVEL.INFO, event, context);
}

export function logWarn(event: string, context: LogContext = {}) {
  writeStructuredLog(LOG_LEVEL.WARN, event, context);
}

export function logError(event: string, context: LogContext = {}) {
  writeStructuredLog(LOG_LEVEL.ERROR, event, context);
}
