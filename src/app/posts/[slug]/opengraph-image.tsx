import { ImageResponse } from "next/og";
import { createPublicServerClient } from "@/lib/supabase/server";

export const alt = "Card de compartilhamento da matéria do Orange Brick";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CATEGORY_LABELS: Record<string, string> = {
  breaking: "Plantão",
  hardware: "Hard News",
  industry: "Radar",
  modding: "Gambiarra",
  review: "Review",
  opinion: "Opinião",
};

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createPublicServerClient();
  const { data } = await supabase
    .from("posts")
    .select("title, summary, category, image_url")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  const post = data as { title: string; summary: string; category: string; image_url: string | null } | null;
  const title = post?.title ?? "Orange Brick";
  const chip = post ? CATEGORY_LABELS[post.category] || post.category : "Notícias de games";
  const cover = post?.image_url;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#0d0e12",
          color: "#ffffff",
        }}
      >
        {cover ? (
          <div style={{ display: "flex", width: "46%", position: "relative" }}>
          <img src={cover} alt="" width={552} height={630} style={{ objectFit: "cover" }} />
            <div style={{ display: "flex", position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(13,14,18,0.15), #0d0e12)" }} />
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            padding: "56px 56px 44px",
          }}
        >
          <div style={{ display: "flex" }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "#FF5E00",
                color: "#000000",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 4,
                textTransform: "uppercase",
                padding: "8px 18px",
              }}
            >
              {chip}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: cover ? 52 : 64,
              fontWeight: 900,
              lineHeight: 1.08,
              textTransform: "uppercase",
              overflow: "hidden",
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ display: "flex", fontSize: 30, fontWeight: 900, letterSpacing: 2 }}>
              ORANGE<span style={{ color: "#FF5E00" }}>_</span>BRICK
            </span>
            <span style={{ display: "flex", height: 4, width: 64, backgroundColor: "#FF5E00" }} />
          </div>
        </div>
      </div>
    ),
    size
  );
}
