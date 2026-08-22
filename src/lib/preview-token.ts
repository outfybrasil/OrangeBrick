import { createHmac, timingSafeEqual } from "crypto";

const PREVIEW_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CLOCK_TOLERANCE_MS = 5 * 60 * 1000;

function getPreviewSecret(): string | null {
  const secret = process.env.PREVIEW_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

function hashPayload(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export function createPreviewToken(slug: string): string {
  const secret = getPreviewSecret();
  if (!secret || !slug) return "";
  const issuedAt = Date.now().toString(36);
  const signature = hashPayload(`${slug}:${issuedAt}`, secret).toString("hex");
  return `${issuedAt}.${signature}`;
}

export function verifyPreviewToken(slug: string, token?: string | null): boolean {
  const secret = getPreviewSecret();
  if (!secret || !slug || !token) return false;
  const separatorIndex = token.indexOf(".");
  if (separatorIndex <= 0) return false;
  const issuedAtRaw = token.slice(0, separatorIndex);
  const signatureHex = token.slice(separatorIndex + 1);
  if (!/^[0-9a-f]+$/i.test(signatureHex)) return false;
  const issuedAt = Number.parseInt(issuedAtRaw, 36);
  if (!Number.isFinite(issuedAt)) return false;
  const now = Date.now();
  if (issuedAt > now + CLOCK_TOLERANCE_MS) return false;
  if (now - issuedAt > PREVIEW_TOKEN_TTL_MS) return false;
  const expected = hashPayload(`${slug}:${issuedAtRaw}`, secret);
  const provided = Buffer.from(signatureHex, "hex");
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
