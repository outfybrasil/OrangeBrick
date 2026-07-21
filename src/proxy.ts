import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          for (const cookie of cookies) request.cookies.set(cookie.name, cookie.value);
          response = NextResponse.next({ request });
          for (const cookie of cookies) response.cookies.set(cookie.name, cookie.value, cookie.options);
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const isLogin = request.nextUrl.pathname === "/admin/login";
  const isAdmin = user?.app_metadata?.is_admin === true;
  if (!isAdmin && !isLogin) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (isAdmin && isLogin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
