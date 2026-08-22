import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_PREFIXES = ["/admin"];
const EMAIL_AUTH_PATHS = new Set(["/cadastro", "/entrar", "/recuperar-senha", "/nova-senha"]);

function contentSecurityPolicy() {
  return [
    "default-src 'self'",
    `script-src 'self' https://www.googletagmanager.com https://plausible.io${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://*.supabase.io wss://*.supabase.co https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://plausible.io https://*.plausible.io",
    "frame-src 'self' https://www.youtube-nocookie.com",
    "media-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function secureRedirect(url: URL, policy: string) {
  const response = NextResponse.redirect(url);
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const policy = contentSecurityPolicy();
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", policy);

  if (EMAIL_AUTH_PATHS.has(pathname) && process.env.EMAIL_AUTH_ENABLED !== "true") {
    return secureRedirect(new URL("/", request.url), policy);
  }

  if (!isProtected(pathname)) {
    return response;
  }

  if (pathname === "/admin/login") {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          for (const { name, value, options } of cookies) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return secureRedirect(loginUrl, policy);
  }

  const isAdmin = user.app_metadata?.is_admin === true;

  if (!isAdmin) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return secureRedirect(loginUrl, policy);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)"],
};
