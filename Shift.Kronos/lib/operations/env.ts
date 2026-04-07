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

export function getOptionalTelegramChatId() {
  return readOptionalEnv("TELEGRAM_CHAT_ID");
}

export function getTelegramBotToken() {
  return readRequiredEnv("TELEGRAM_BOT_TOKEN");
}

export function getCronSecret() {
  return readRequiredEnv("PHASE7_CRON_SECRET");
}

export function getTelegramWebhookSecret() {
  return readRequiredEnv("PHASE7_TELEGRAM_WEBHOOK_SECRET");
}
