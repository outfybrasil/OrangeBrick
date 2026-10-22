import { NextResponse } from "next/server";
import { createPublicServerClient } from "@/lib/supabase/server";
import { getReelAdmin } from "@/lib/video/reel-remote";
import type { Post } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const incoming = new URL(request.url);
  const destination = new URL("/noticias", incoming.origin);
  const source = incoming.searchParams.get("utm_source");
  const platform = source === "instagram" || source === "tiktok" || source === "youtube" ? source : null;

  try {
    const { data, error } = await createPublicServerClient()
      .from("posts")
      .select("id,slug")
      .eq("slug", slug)
      .eq("is_published", true)
      .is("archived_at", null)
      .lte("published_at", new Date().toISOString())
      .maybeSingle<Pick<Post, "id" | "slug">>();

    if (!error && data?.slug) {
      destination.pathname = `/posts/${encodeURIComponent(data.slug)}`;
      destination.searchParams.set("utm_content", data.slug);
      if (platform) {
        try {
          await getReelAdmin().from("reel_social_clicks").insert({ post_id: data.id, platform });
        } catch {}
      }
    }
  } catch {
    destination.pathname = "/noticias";
  }

  if (platform) {
    destination.searchParams.set("utm_source", platform);
    destination.searchParams.set("utm_medium", "reel");
    destination.searchParams.set("utm_campaign", "reel");
  }

  const response = NextResponse.redirect(destination, 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
