import { NextResponse } from "next/server";
import { createPublicServerClient } from "@/lib/supabase/server";
import { getReelAdmin } from "@/lib/video/reel-remote";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const destination = new URL("/noticias", incoming.origin);

  try {
    const { data, error } = await createPublicServerClient()
      .from("posts")
      .select("id,slug")
      .eq("is_published", true)
      .is("archived_at", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; slug: string }>();

    if (!error && data?.slug) {
      destination.pathname = `/posts/${encodeURIComponent(data.slug)}`;
      destination.searchParams.set("utm_content", data.slug);
      const platform = incoming.searchParams.get("utm_source");
      if (platform === "instagram" || platform === "tiktok" || platform === "youtube") {
        try {
          await getReelAdmin().from("reel_social_clicks").insert({ post_id: data.id, platform });
        } catch {}
      }
    }
  } catch {
    destination.pathname = "/noticias";
  }

  const source = incoming.searchParams.get("utm_source");
  destination.searchParams.set("utm_source", source === "instagram" || source === "tiktok" ? source : "social");
  destination.searchParams.set("utm_medium", "bio");
  destination.searchParams.set("utm_campaign", "reel");

  const response = NextResponse.redirect(destination, 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
