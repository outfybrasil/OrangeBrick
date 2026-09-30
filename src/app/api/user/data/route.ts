import { NextResponse } from "next/server";
import {
  USER_DATA_EXPORT_DATASETS,
  USER_DATA_EXPORT_PAGE_SIZE,
  type UserDataExportDataset,
} from "@/lib/user-data-export";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ExportRow = { id: string | number };

async function createPage<T extends ExportRow>(
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>
) {
  const { data, error } = await query;

  if (error) {
    throw new Error("Falha ao reunir todos os dados da conta");
  }

  const rows = data ?? [];
  const lastRow = rows.length === USER_DATA_EXPORT_PAGE_SIZE ? rows[rows.length - 1] : null;

  return {
    rows,
    next_cursor: lastRow ? String(lastRow.id) : null,
  };
}

function jsonHeaders(userId: string) {
  return {
    "Cache-Control": "no-store, max-age=0",
    "Content-Disposition": `attachment; filename="orange-brick-dados-${userId}.json"`,
  };
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const params = new URL(request.url).searchParams;
    const dataset = params.get("dataset");
    const rawDeviceId = request.headers.get("x-orange-brick-device") ?? "";
    const deviceId = /^[a-f0-9]{32}$/.test(rawDeviceId) ? rawDeviceId : null;

    if (dataset) {
      if (!USER_DATA_EXPORT_DATASETS.includes(dataset as UserDataExportDataset)) {
        return NextResponse.json({ error: "Conjunto de dados inválido" }, { status: 400 });
      }

      const cursor = params.get("cursor");
      const validCursor = cursor === null || (dataset === "article_reactions"
        ? /^\d+$/.test(cursor)
        : /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cursor));
      if (!validCursor) {
        return NextResponse.json({ error: "Cursor inválido" }, { status: 400 });
      }

      const start = 0;
      const end = USER_DATA_EXPORT_PAGE_SIZE - 1;
      const page = (() => {
        switch (dataset as UserDataExportDataset) {
          case "article_comments": {
            let query = serviceClient.from("comments").select("*").eq("user_id", user.id).order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "article_reactions": {
            if (!deviceId) return Promise.resolve({ rows: [], next_cursor: null });
            let query = serviceClient
              .from("reactions")
              .select("id,post_id,device_id,reaction_type,created_at")
              .eq("device_id", deviceId)
              .order("id");
            if (cursor) {
              const numericCursor = Number(cursor);
              query = query.gt("id", numericCursor);
            }
            return createPage(query.range(start, end));
          }
          case "article_views": {
            if (!deviceId) return Promise.resolve({ rows: [], next_cursor: null });
            let query = serviceClient
              .from("post_views")
              .select("id,post_id,device_id,viewed_at")
              .eq("device_id", deviceId)
              .order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "community_posts": {
            let query = serviceClient.from("community_posts").select("*").eq("user_id", user.id).order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "community_comments": {
            let query = serviceClient.from("community_comments").select("*").eq("user_id", user.id).order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "community_reactions": {
            let query = serviceClient.from("community_reactions").select("*").eq("user_id", user.id).order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "community_poll_votes": {
            let query = serviceClient.from("community_poll_votes").select("*").eq("user_id", user.id).order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "community_comment_likes": {
            let query = serviceClient.from("community_comment_likes").select("*").eq("user_id", user.id).order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "notifications": {
            let query = serviceClient.from("notifications").select("*").eq("user_id", user.id).order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "push_subscriptions": {
            let query = serviceClient
              .from("push_subscriptions")
              .select("id,endpoint,user_agent,created_at")
              .eq("user_id", user.id)
              .order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "contact_submissions": {
            if (!user.email) return Promise.resolve({ rows: [], next_cursor: null });
            let query = serviceClient
              .from("contact_submissions")
              .select("id,name,company,subject,email,budget,message,is_read,created_at")
              .eq("email", user.email.toLowerCase())
              .order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
        }
      })();

      return NextResponse.json(await page, { headers: jsonHeaders(user.id) });
    }

    const [profile, newsletterSubscription] = await Promise.all([
      serviceClient.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      user.email
        ? serviceClient
            .from("newsletter_subscribers")
            .select("email,created_at")
            .eq("email", user.email.toLowerCase())
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (profile.error || newsletterSubscription.error) {
      throw new Error("Falha ao reunir todos os dados da conta");
    }

    return NextResponse.json(
      {
        generated_at: new Date().toISOString(),
        account: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          authentication_provider: user.app_metadata?.provider ?? null,
        },
        profile: profile.data ?? null,
        newsletter_subscription: newsletterSubscription.data ?? null,
      },
      { headers: jsonHeaders(user.id) }
    );
  } catch (error) {
    const reference = crypto.randomUUID();
    console.error("Falha na exportação de dados", reference, error);
    return NextResponse.json(
      { error: "Não foi possível exportar os dados", reference },
      { status: 500 }
    );
  }
}
