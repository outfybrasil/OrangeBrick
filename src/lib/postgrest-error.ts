export function postgrestErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export function isMissingPostgrestRelation(error: unknown): boolean {
  return postgrestErrorCode(error) === "PGRST205";
}

export function isMissingPostgrestColumn(error: unknown): boolean {
  return postgrestErrorCode(error) === "42703";
}

export function isMissingPostgrestFunction(error: unknown): boolean {
  const code = postgrestErrorCode(error);
  return code === "PGRST202" || code === "42883";
}
