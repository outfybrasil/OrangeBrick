import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const rawDeviceId = request.headers.get("x-orange-brick-device") ?? "";
    const deviceId = /^[a-f0-9]{32}$/.test(rawDeviceId) ? rawDeviceId : null;

    const [
      profile,
      comments,
      articleReactions,
      postViews,
      communityPosts,
      communityComments,
      communityReactions,
      communityPollVotes,
      communityCommentLikes,
      notifications,
      contactSubmissions,
    ] = await Promise.all([
      serviceClient.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      serviceClient.from("comments").select("*").eq("user_id", user.id),
      deviceId
        ? serviceClient.from("reactions").select("*").eq("device_id", deviceId)
        : Promise.resolve({ data: [], error: null }),
      deviceId
        ? serviceClient.from("post_views").select("*").eq("device_id", deviceId)
        : Promise.resolve({ data: [], error: null }),
      serviceClient.from("community_posts").select("*").eq("user_id", user.id),
      serviceClient.from("community_comments").select("*").eq("user_id", user.id),
      serviceClient.from("community_reactions").select("*").eq("user_id", user.id),
      serviceClient.from("community_poll_votes").select("*").eq("user_id", user.id),
      serviceClient.from("community_comment_likes").select("*").eq("user_id", user.id),
      serviceClient.from("notifications").select("*").eq("user_id", user.id),
      user.email
        ? serviceClient.from("contact_submissions").select("*").eq("email", user.email)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const results = [
      profile,
      comments,
      articleReactions,
      postViews,
      communityPosts,
      communityComments,
      communityReactions,
      communityPollVotes,
      communityCommentLikes,
      notifications,
      contactSubmissions,
    ];

    if (results.some((result) => result.error)) {
      throw new Error("Falha ao reunir todos os dados da conta");
    }

    const payload = {
      generated_at: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        authentication_provider: user.app_metadata?.provider ?? null,
      },
      profile: profile.data ?? null,
      article_comments: comments.data ?? [],
      article_reactions: articleReactions.data ?? [],
      article_views: postViews.data ?? [],
      community_posts: communityPosts.data ?? [],
      community_comments: communityComments.data ?? [],
      community_reactions: communityReactions.data ?? [],
      community_poll_votes: communityPollVotes.data ?? [],
      community_comment_likes: communityCommentLikes.data ?? [],
      notifications: notifications.data ?? [],
      contact_submissions: contactSubmissions.data ?? [],
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Disposition": `attachment; filename="orange-brick-dados-${user.id}.json"`,
      },
    });
  } catch (error) {
    const reference = crypto.randomUUID();
    console.error("Falha na exportação de dados", reference, error);
    return NextResponse.json(
      { error: "Não foi possível exportar os dados", reference },
      { status: 500 }
    );
  }
}
