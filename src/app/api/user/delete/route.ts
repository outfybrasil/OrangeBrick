import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

async function listStoragePaths(
  client: ReturnType<typeof createServiceRoleClient>,
  bucket: string,
  directory: string,
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await client.storage.from(bucket).list(directory, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;

    const files = (data || []).filter((file) => file.id);
    paths.push(...files.map((file) => `${directory}/${file.name}`));
    if (!data || data.length < 100) return paths;
    offset += data.length;
  }
}

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
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const rawDeviceId = request.headers.get("x-orange-brick-device") ?? "";
    const deviceId = /^[a-f0-9]{32}$/.test(rawDeviceId) ? rawDeviceId : null;
    const [profileImagePaths, legacyAvatarPaths] = await Promise.all([
      listStoragePaths(serviceClient, "profile-images", user.id),
      listStoragePaths(serviceClient, "post-images", `avatars/${user.id}`),
    ]);
    if (profileImagePaths.length) {
      const { error } = await serviceClient.storage.from("profile-images").remove(profileImagePaths);
      if (error) throw error;
    }
    if (legacyAvatarPaths.length) {
      const { error } = await serviceClient.storage.from("post-images").remove(legacyAvatarPaths);
      if (error) throw error;
    }

    const deleteUserAccountData = serviceClient.rpc.bind(serviceClient) as unknown as (
      name: "delete_user_account_data",
      args: { p_user_id: string; p_device_id: string | null; p_email: string | null }
    ) => PromiseLike<{ error: { message: string } | null }>;
    const { error: cleanupError } = await deleteUserAccountData("delete_user_account_data", {
      p_user_id: user.id,
      p_device_id: deviceId,
      p_email: user.email?.toLowerCase() || null,
    });
    if (cleanupError) throw cleanupError;

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
