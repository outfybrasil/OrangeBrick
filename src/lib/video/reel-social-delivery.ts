import { getReelAdmin } from "./reel-remote";

export type ReelSocialPlatform = "instagram" | "tiktok" | "youtube";
export type ReelSocialStatus = "processing" | "submitted" | "published" | "failed" | "unknown";

export interface ReelSocialPublication {
  platform: ReelSocialPlatform;
  status: ReelSocialStatus;
  external_id: string | null;
  error: string | null;
  updated_at: string;
  visibility?: "public" | "unlisted" | "private";
}

export interface SocialDeliveryClaim {
  postId: string;
  platform: ReelSocialPlatform;
  updatedAt: string;
}

export async function beginSocialDelivery(postId: unknown, platform: ReelSocialPlatform, options: { automatic?: boolean; repost?: boolean } = {}, db = getReelAdmin()): Promise<SocialDeliveryClaim | null> {
  if (typeof postId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) return null;
  const { data: job, error: jobError } = await db.from("reel_jobs").select("id").eq("post_id", postId).eq("status", "ready").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (jobError || !job) throw new Error("Não foi possível conferir o Reel antes do envio.");
  let updatedAt = new Date().toISOString();
  const record = { post_id: postId, platform, reel_job_id: job.id, status: "processing", external_id: null, error: null, updated_at: updatedAt };
  const { error: insertError } = await db.from("reel_social_publications").insert(record);
  if (!insertError) return { postId, platform, updatedAt };
  if (insertError.code !== "23505") throw new Error("Não foi possível reservar o envio à rede social.");
  if (options.automatic) return null;
  const { data: existing, error: readError } = await db.from("reel_social_publications").select("status,updated_at").eq("post_id", postId).eq("platform", platform).maybeSingle();
  if (readError) throw new Error("Não foi possível conferir o histórico da publicação.");
  const canRepost = options.repost && (existing?.status === "published" || platform === "youtube" && existing?.status === "submitted");
  if (!existing || existing.status !== "failed" && !canRepost) return null;
  updatedAt = new Date(Math.max(Date.now(), Date.parse(existing.updated_at) + 1)).toISOString();
  record.updated_at = updatedAt;
  const { data: claimed, error: claimError } = await db.from("reel_social_publications").update(record).eq("post_id", postId).eq("platform", platform).eq("status", existing.status).eq("updated_at", existing.updated_at).select("post_id").maybeSingle();
  if (claimError) throw new Error("Não foi possível reservar uma nova tentativa de envio.");
  return claimed ? { postId, platform, updatedAt } : null;
}

export async function finishSocialDelivery(claim: SocialDeliveryClaim, status: ReelSocialStatus, externalId: string | null = null, error: string | null = null, db = getReelAdmin()) {
  const { data, error: saveError } = await db.from("reel_social_publications")
    .update({ status, external_id: externalId, error, updated_at: new Date().toISOString() })
    .eq("post_id", claim.postId).eq("platform", claim.platform).eq("status", "processing").eq("updated_at", claim.updatedAt).select("post_id").maybeSingle();
  if (saveError || !data) throw new Error("O resultado do envio não pôde ser salvo. Confira a rede antes de repetir.");
}
