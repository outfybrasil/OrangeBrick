import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RegisterViewRequest {
  post_id: string;
  device_id: string;
}

serve(async (req) => {
  try {
    const { post_id, device_id }: RegisterViewRequest = await req.json();

    if (!post_id || !device_id) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: post_id, device_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existing } = await supabase
      .from("post_views")
      .select("id")
      .eq("post_id", post_id)
      .eq("device_id", device_id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ action: "already_viewed" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    await supabase.from("post_views").insert({
      post_id,
      device_id,
    });

    return new Response(JSON.stringify({ action: "registered" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
