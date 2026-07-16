import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push";

interface NotifyRequest {
  title: string;
  body: string;
  url: string;
  icon?: string;
  badge?: string;
}

serve(async (req) => {
  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    webpush.setVapidDetails(
      "mailto:contact@orangebrick.com",
      vapidPublicKey,
      vapidPrivateKey
    );

    const { title, body, url, icon, badge }: NotifyRequest = await req.json();

    if (!title || !body || !url) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: title, body, url" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title,
      body,
      url,
      icon: icon || "/logos/Logo Tijolo Quebrado.PNG",
      badge: badge || "/logos/Logo Tijolo Quebrado.PNG",
    });

    let sent = 0;
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key,
            },
          },
          payload
        ).then(() => {
          sent++;
        }).catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        })
      )
    );

    return new Response(JSON.stringify({ sent, total: subscriptions.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
