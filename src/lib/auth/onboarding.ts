export const ONBOARDING_COMPLETED_AT = "orange_brick_onboarding_completed_at";
export const ONBOARDING_PENDING = "orange_brick_onboarding_pending";
export const ONBOARDING_GUIDE_PATH = "/primeiros-passos";
export const ONBOARDING_PROFILE_PATH = "/profile/setup?returnTo=%2Fprimeiros-passos";

export function hasCompletedOnboarding(userMetadata: unknown): boolean {
  if (!userMetadata || typeof userMetadata !== "object") return false;
  return typeof (userMetadata as Record<string, unknown>)[ONBOARDING_COMPLETED_AT] === "string";
}

export function requiresOnboarding(userMetadata: unknown): boolean {
  if (!userMetadata || typeof userMetadata !== "object") return false;
  const metadata = userMetadata as Record<string, unknown>;
  return !hasCompletedOnboarding(metadata) && metadata[ONBOARDING_PENDING] === true;
}
