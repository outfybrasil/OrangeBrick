import { getReelAdmin } from "./reel-remote";

export async function hasSocialDelivery(postId: unknown, platform: "instagram" | "tiktok") {
  if (typeof postId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) return false;
  const { data } = await getReelAdmin().from("reel_social_publications").select("post_id").eq("post_id", postId).eq("platform", platform).limit(1);
  return Boolean(data?.length);
}

export async function recordManualSocialDelivery(postId: unknown, platform: "instagram" | "tiktok", status: "published" | "submitted" | "unknown", externalId: string | null, error: string | null = null) {
  if (typeof postId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) return false;
  const db = getReelAdmin();
  const { data: job, error: jobError } = await db.from("reel_jobs").select("id").eq("post_id", postId).eq("status", "ready").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (jobError || !job) return false;
  const { error: saveError } = await db.from("reel_social_publications").insert({ post_id: postId, platform, reel_job_id: job.id, status, external_id: externalId, error });
  return !saveError || saveError.code === "23505";
}
