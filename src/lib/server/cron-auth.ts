import { timingSafeEqual } from "node:crypto";

export const MIN_CRON_SECRET_LENGTH = 16;

export function isAuthorizedCronRequest(request: Request, configuredSecret = process.env.CRON_SECRET): boolean {
  const secret = configuredSecret?.trim();
  if (!secret || secret.length < MIN_CRON_SECRET_LENGTH) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") || "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
