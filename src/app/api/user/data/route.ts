import { NextResponse } from "next/server";
import {
  USER_DATA_EXPORT_DATASETS,
  USER_DATA_EXPORT_PAGE_SIZE,
  type UserDataExportDataset,
} from "@/lib/user-data-export";
import { createServerSupabaseClient, createServiceDataClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ExportRow = object;

async function createPage<T extends ExportRow>(
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  cursorKey = "id",
) {
  const { data, error } = await query;

  if (error) {
    throw new Error("Falha ao reunir todos os dados da conta");
  }

  const rows = data ?? [];
  const lastRow = rows.length === USER_DATA_EXPORT_PAGE_SIZE ? rows[rows.length - 1] : null;
  const cursorValue = lastRow ? Reflect.get(lastRow, cursorKey) : null;

  return {
    rows,
    next_cursor: cursorValue === undefined || cursorValue === null ? null : String(cursorValue),
  };
}

async function createOffsetPage<T extends ExportRow>(
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  offset: number,
) {
  const { data, error } = await query;
  if (error) throw new Error("Falha ao reunir todos os dados da conta");
  const rows = data ?? [];
  return {
    rows,
    next_cursor: rows.length === USER_DATA_EXPORT_PAGE_SIZE ? String(offset + rows.length) : null,
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

    const serviceClient = createServiceDataClient();
    const params = new URL(request.url).searchParams;
    const dataset = params.get("dataset");

    if (dataset) {
      if (!USER_DATA_EXPORT_DATASETS.includes(dataset as UserDataExportDataset)) {
        return NextResponse.json({ error: "Conjunto de dados inválido" }, { status: 400 });
      }

      const cursor = params.get("cursor");
      const followOffset = cursor === null ? 0 : Number(cursor);
      const validCursor = cursor === null || (dataset === "user_follows"
        ? /^\d+$/.test(cursor)
          && Number.isSafeInteger(followOffset)
          && followOffset >= 0
          && followOffset % USER_DATA_EXPORT_PAGE_SIZE === 0
          && Number.isSafeInteger(followOffset + USER_DATA_EXPORT_PAGE_SIZE - 1)
        : /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cursor));
      if (!validCursor) {
        return NextResponse.json({ error: "Cursor inválido" }, { status: 400 });
      }

      const start = 0;
      const end = USER_DATA_EXPORT_PAGE_SIZE - 1;
      const page = (() => {
        switch (dataset as UserDataExportDataset) {
          case "article_comments": {
            let query = serviceClient.from("comments").select("id,post_id,user_id,parent_id,content,created_at,updated_at").eq("user_id", user.id).order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "article_comment_likes": {
            let query = serviceClient.from("article_comment_likes").select("id,comment_id,user_id,created_at").eq("user_id", user.id).order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "community_posts": {
            let query = serviceClient.from("community_posts").select("id,user_id,author_name,author_username,author_avatar,content,media_url,media_alt,platform_tag,shared_post_id,is_official,is_pinned,created_at,topic_id,source_post_id,is_official_thread").eq("user_id", user.id).order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "community_comments": {
            let query = serviceClient.from("community_comments").select("id,post_id,parent_id,user_id,author_name,author_username,author_avatar,is_official,content,created_at").eq("user_id", user.id).order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "community_reactions": {
            let query = serviceClient.from("community_reactions").select("id,post_id,user_id,reaction_type,created_at").eq("user_id", user.id).order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "community_poll_votes": {
            let query = serviceClient.from("community_poll_votes").select("id,poll_id,user_id,option_index,created_at").eq("user_id", user.id).order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "community_comment_likes": {
            let query = serviceClient.from("community_comment_likes").select("id,comment_id,user_id,created_at").eq("user_id", user.id).order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "notifications": {
            let query = serviceClient.from("notifications").select("id,user_id,type,message,reference_type,reference_id,is_read,created_at").eq("user_id", user.id).order("id");
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
          case "user_progress": {
            let query = serviceClient.from("user_progress").select("user_id,lifetime_xp,level,active_days,last_xp_at,updated_at").eq("user_id", user.id).order("user_id");
            if (cursor) query = query.gt("user_id", cursor);
            return createPage(query.range(start, end), "user_id");
          }
          case "xp_events": {
            let query = serviceClient.from("xp_events").select("id,event_type,source_type,source_id,xp_amount,status,season_id,occurred_at,revoked_at,revocation_reason").eq("user_id", user.id).order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "season_progress": {
            let query = serviceClient.from("season_progress").select("season_id,eligible_xp,active_days,division,rank,percentile,is_qualified,is_disqualified,updated_at").eq("user_id", user.id).order("season_id");
            if (cursor) query = query.gt("season_id", cursor);
            return createPage(query.range(start, end), "season_id");
          }
          case "user_achievements": {
            let query = serviceClient.from("user_achievements").select("achievement_id,progress,target,unlocked_at,notified_at,is_equipped,equipped_order").eq("user_id", user.id).order("achievement_id");
            if (cursor) query = query.gt("achievement_id", cursor);
            return createPage(query.range(start, end), "achievement_id");
          }
          case "user_rewards": {
            let query = serviceClient.from("user_rewards").select("reward_id,source_type,source_id,unlocked_at,expires_at").eq("user_id", user.id).order("reward_id");
            if (cursor) query = query.gt("reward_id", cursor);
            return createPage(query.range(start, end), "reward_id");
          }
          case "user_follows": {
            const offset = cursor ? Number(cursor) : 0;
            const query = serviceClient.from("user_follows").select("follow_type,follow_value,created_at").eq("user_id", user.id).order("follow_type").order("follow_value").range(offset, offset + USER_DATA_EXPORT_PAGE_SIZE - 1);
            return createOffsetPage(query, offset);
          }
          case "notification_preferences": {
            let query = serviceClient.from("notification_preferences").select("user_id,breaking_news,followed_topics,brickboard_replies,weekly_digest,updated_at").eq("user_id", user.id).order("user_id");
            if (cursor) query = query.gt("user_id", cursor);
            return createPage(query.range(start, end), "user_id");
          }
          case "release_hype_votes": {
            let query = serviceClient.from("release_hype_votes").select("id,release_id,vote_type,created_at").eq("user_id", user.id).order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "community_reports": {
            let query = serviceClient.from("community_reports").select("id,content_type,content_id,reason,status,created_at,reviewed_at").eq("reporter_id", user.id).order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "community_notes": {
            let query = serviceClient.from("community_notes").select("id,post_id,content,source_url,status,created_at").eq("user_id", user.id).order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "community_note_votes": {
            let query = serviceClient.from("community_note_votes").select("note_id,created_at").eq("user_id", user.id).order("note_id");
            if (cursor) query = query.gt("note_id", cursor);
            return createPage(query.range(start, end), "note_id");
          }
          case "admin_preferences": {
            let query = serviceClient.from("admin_preferences").select("user_id,default_author,default_category,updated_at").eq("user_id", user.id).order("user_id");
            if (cursor) query = query.gt("user_id", cursor);
            return createPage(query.range(start, end), "user_id");
          }
          case "game_clubs": {
            let query = serviceClient.from("game_clubs").select("id,topic_id,name,description,created_by,created_at").eq("created_by", user.id).order("id");
            if (cursor) query = query.gt("id", cursor);
            return createPage(query.range(start, end));
          }
          case "game_club_members": {
            let query = serviceClient.from("game_club_members").select("club_id,user_id,joined_at").eq("user_id", user.id).order("club_id");
            if (cursor) query = query.gt("club_id", cursor);
            return createPage(query.range(start, end), "club_id");
          }
        }
      })();

      return NextResponse.json(await page, { headers: jsonHeaders(user.id) });
    }

    const [profile, newsletterSubscription] = await Promise.all([
      serviceClient
        .from("profiles")
        .select("id,user_id,nickname,username,display_name,avatar_url,banner_url,bio,is_official,favorite_platforms,favorite_categories,equipped_title,equipped_frame,profile_theme,show_lifetime_xp,show_activity_stats,show_season_history,show_in_leaderboard,created_at,updated_at,playing_now,favorite_games")
        .eq("user_id", user.id)
        .maybeSingle(),
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
        export_scope: {
          excluded_data: ["Leituras e reações anônimas vinculadas ao aparelho; esses dados não estão associados a esta conta."],
        },
        account: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          created_at: user.created_at,
          updated_at: user.updated_at,
          email_confirmed_at: user.email_confirmed_at,
          phone_confirmed_at: user.phone_confirmed_at,
          last_sign_in_at: user.last_sign_in_at,
          authentication_provider: user.app_metadata?.provider ?? null,
          linked_providers: user.app_metadata?.providers ?? [],
          user_metadata: user.user_metadata,
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
