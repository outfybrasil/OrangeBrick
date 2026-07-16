import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { post_id, device_id } = await req.json();

    if (!post_id || !device_id) {
      return NextResponse.json(
        { error: "Campos obrigatórios: post_id, device_id" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("post_views")
      .select("id")
      .eq("post_id", post_id)
      .eq("device_id", device_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ action: "already_viewed" });
    }

    await supabase.from("post_views").insert({
      post_id,
      device_id,
    });

    return NextResponse.json({ action: "registered" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
