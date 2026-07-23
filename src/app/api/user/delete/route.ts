import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "same-site" && site !== "none") return false;
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }

  try {
    const supabase = await createServerSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const rawDeviceId = request.headers.get("x-orange-brick-device") ?? "";
    const deviceId = /^[a-f0-9]{32}$/.test(rawDeviceId) ? rawDeviceId : null;
    const deletions = [
      await serviceClient.from("community_comment_likes").delete().eq("user_id", user.id),
      await serviceClient.from("community_poll_votes").delete().eq("user_id", user.id),
      await serviceClient.from("community_reactions").delete().eq("user_id", user.id),
      await serviceClient.from("community_comments").delete().eq("user_id", user.id),
      await serviceClient.from("community_posts").delete().eq("user_id", user.id),
      await serviceClient.from("notifications").delete().eq("user_id", user.id),
      await serviceClient.from("comments").delete().eq("user_id", user.id),
      await serviceClient.from("profiles").delete().eq("user_id", user.id),
    ];

    if (deviceId) {
      deletions.push(
        await serviceClient.from("reactions").delete().eq("device_id", deviceId),
        await serviceClient.from("post_views").delete().eq("device_id", deviceId)
      );
    }

    if (user.email) {
      deletions.push(
        await serviceClient.from("contact_submissions").delete().eq("email", user.email)
      );
    }

    if (deletions.some((result) => result.error)) {
      throw new Error("Falha ao remover dados associados");
    }

    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    const response = NextResponse.json({
      success: true,
      message: "Conta e dados associados excluídos",
    });

    const cookieNames = (request.headers.get("cookie") ?? "")
      .split(";")
      .map((cookie) => cookie.trim().split("=")[0])
      .filter((name) => name.startsWith("sb-"));

    for (const name of cookieNames) {
      response.cookies.set(name, "", {
        expires: new Date(0),
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }

    return response;
  } catch (error) {
    const reference = crypto.randomUUID();
    console.error("Falha na exclusão de conta", reference, error);
    return NextResponse.json(
      { error: "Não foi possível excluir a conta", reference },
      { status: 500 }
    );
  }
}
