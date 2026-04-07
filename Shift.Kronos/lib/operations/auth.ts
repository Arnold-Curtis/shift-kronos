import { timingSafeEqual } from "node:crypto";
import { getCronSecret, getTelegramWebhookSecret } from "@/lib/operations/env";

function toBuffer(value: string) {
  return Buffer.from(value, "utf8");
}

export function isAuthorizedCronRequest(request: Request) {
  const headerValue = request.headers.get("x-cron-secret") ?? request.headers.get("authorization");
  const expectedSecret = getCronSecret();

  if (!headerValue) {
    return false;
  }

  const normalizedHeader = headerValue.startsWith("Bearer ") ? headerValue.slice(7) : headerValue;
  const provided = toBuffer(normalizedHeader);
  const expected = toBuffer(expectedSecret);

  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}

export function isAuthorizedTelegramWebhookRequest(request: Request) {
  const headerValue = request.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = getTelegramWebhookSecret();

  if (!headerValue) {
    return false;
  }

  const provided = toBuffer(headerValue);
  const expected = toBuffer(expectedSecret);

  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}
