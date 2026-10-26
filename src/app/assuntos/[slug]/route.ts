import { NextResponse } from "next/server";
import { createPublicServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface TopicRouteProps {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: TopicRouteProps) {
  const { slug } = await params;

  try {
    const supabase = createPublicServerClient();
    const { data } = (await supabase
      .from("topics")
      .select("name")
      .eq("id", decodeURIComponent(slug))
      .eq("is_active", true)
      .maybeSingle()) as { data: { name: string } | null };

    const name = data?.name;
    if (typeof name === "string" && name.trim()) {
      const destination = `/noticias?q=${encodeURIComponent(name.trim().slice(0, 80))}`;
      return NextResponse.redirect(new URL(destination, request.url), {
        status: 308,
        headers: { "X-Robots-Tag": "noindex" },
      });
    }
  } catch {
    return new NextResponse(null, {
      status: 404,
      headers: { "X-Robots-Tag": "noindex" },
    });
  }

  return new NextResponse(null, {
    status: 404,
    headers: { "X-Robots-Tag": "noindex" },
  });
}
