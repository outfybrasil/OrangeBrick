import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const { post_id, device_id, reaction_type } = await req.json();

    if (!post_id || !device_id || !reaction_type) {
      return NextResponse.json(
        { error: "Campos obrigatórios: post_id, device_id, reaction_type" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("reactions")
      .select("*")
      .eq("post_id", post_id)
      .eq("device_id", device_id)
      .single();

    if (existing) {
      if (existing.reaction_type === reaction_type) {
        await supabase.from("reactions").delete().eq("id", existing.id);
        return NextResponse.json({ action: "removed" });
      }

      await supabase
        .from("reactions")
        .update({ reaction_type, ip_address: clientIp })
        .eq("id", existing.id);

      return NextResponse.json({
        action: "updated",
        from: existing.reaction_type,
        to: reaction_type,
      });
    }

    const { data: ipVote } = await supabase
      .from("reactions")
      .select("id, reaction_type")
      .eq("post_id", post_id)
      .eq("ip_address", clientIp)
      .maybeSingle();

    if (ipVote) {
      await supabase
        .from("reactions")
        .update({ reaction_type, device_id })
        .eq("id", ipVote.id);

      return NextResponse.json({
        action: "updated_ip",
        from: ipVote.reaction_type,
        to: reaction_type,
      });
    }

    await supabase.from("reactions").insert({
      post_id,
      device_id,
      reaction_type,
      ip_address: clientIp,
    });

    return NextResponse.json({ action: "inserted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
