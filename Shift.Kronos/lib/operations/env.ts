function readOptionalEnv(key: string) {
  const value = process.env[key]?.trim();
  return value ? value : null;
}

function readRequiredEnv(key: string) {
  const value = readOptionalEnv(key);

  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

export function getOptionalNotificationToEmail() {
  return readOptionalEnv("NOTIFICATION_TO_EMAIL");
}

export function getNotificationFromEmail() {
  return readRequiredEnv("NOTIFICATION_FROM_EMAIL");
}

export function getResendApiKey() {
  return readRequiredEnv("RESEND_API_KEY");
}

export function getCronSecret() {
  return readRequiredEnv("PHASE7_CRON_SECRET");
}

export function getNotificationActionSecret() {
  return readRequiredEnv("PHASE7_NOTIFICATION_ACTION_SECRET");
}
