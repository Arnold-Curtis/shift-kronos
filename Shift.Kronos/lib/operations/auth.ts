import { timingSafeEqual } from "node:crypto";
import { getCronSecret } from "@/lib/operations/env";

function toBuffer(value: string) {
  return Buffer.from(value, "utf8");
}

function isVercelCronRequest(request: Request) {
  const userAgent = request.headers.get("user-agent")?.trim().toLowerCase();
  return userAgent === "vercel-cron/1.0";
}

export function isAuthorizedCronRequest(request: Request) {
  if (isVercelCronRequest(request)) {
    return true;
  }

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
