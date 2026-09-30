import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { ipAddress } from "@vercel/functions";

export function getRateLimitIdentity(request: Request, secret: string, allowLocalFallback = process.env.NODE_ENV !== "production") {
  const address = ipAddress(request) || (allowLocalFallback ? "127.0.0.1" : null);
  if (!address || isIP(address) === 0 || !secret) return null;
  return createHash("sha256").update(`${secret}:${address}`).digest("hex");
}

export function getRateLimitWindowStart(date = new Date(), intervalMs = 60_000) {
  return new Date(Math.floor(date.getTime() / intervalMs) * intervalMs);
}
