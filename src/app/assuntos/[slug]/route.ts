import { NextResponse } from "next/server";
import { createPublicServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface TopicRouteProps {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: TopicRouteProps) {
  const { slug } = await params;
  let destination = "/noticias";

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
      destination = `/noticias?q=${encodeURIComponent(name.trim().slice(0, 80))}`;
    }
  } catch {
    destination = "/noticias";
  }

  return NextResponse.redirect(new URL(destination, request.url), 308);
}
