import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ToggleRequest {
  post_id: string;
  device_id: string;
  reaction_type: "hype" | "flop" | "salty" | "defendo" | "brick";
}

serve(async (req) => {
  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";

    const { post_id, device_id, reaction_type }: ToggleRequest = await req.json();

    if (!post_id || !device_id || !reaction_type) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: post_id, device_id, reaction_type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar reação existente pelo IP
    const { data: existing } = await supabase
      .from("reactions")
      .select("*")
      .eq("post_id", post_id)
      .eq("device_id", device_id)
      .single();

    if (existing) {
      if (existing.reaction_type === reaction_type) {
        // Mesmo tipo → remover (toggle off)
        await supabase.from("reactions").delete().eq("id", existing.id);
        return new Response(JSON.stringify({ action: "removed" }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // Tipo diferente → atualizar
      await supabase
        .from("reactions")
        .update({ reaction_type, ip_address: clientIp })
        .eq("id", existing.id);

      return new Response(JSON.stringify({ action: "updated", from: existing.reaction_type, to: reaction_type }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verificar se este IP já votou neste post
    const { data: ipVote } = await supabase
      .from("reactions")
      .select("id, reaction_type")
      .eq("post_id", post_id)
      .eq("ip_address", clientIp)
      .maybeSingle();

    if (ipVote) {
      // Este IP já votou com outro device → atualizar
      await supabase
        .from("reactions")
        .update({ reaction_type, device_id })
        .eq("id", ipVote.id);

      return new Response(JSON.stringify({ action: "updated_ip", from: ipVote.reaction_type, to: reaction_type }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Novo voto
    await supabase.from("reactions").insert({
      post_id,
      device_id,
      reaction_type,
      ip_address: clientIp,
    });

    return new Response(JSON.stringify({ action: "inserted" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
