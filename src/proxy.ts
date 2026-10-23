import { isVerifiedAdminSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_PREFIXES = ["/admin"];
const EMAIL_AUTH_PATHS = new Set(["/cadastro", "/entrar", "/recuperar-senha", "/nova-senha"]);

function contentSecurityPolicy(nonce: string) {
  const mediaOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
    : "";
  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID ?? "";
  const adSlots = [process.env.NEXT_PUBLIC_ADSENSE_HOME_SLOT_ID, process.env.NEXT_PUBLIC_ADSENSE_ARTICLE_SLOT_ID];
  const adsenseEnabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true" && /^pub-\d{16}$/.test(publisherId);
  const adsenseHasSlots = adsenseEnabled && adSlots.some((slotId) => /^\d+$/.test(slotId ?? ""));
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${adsenseHasSlots ? " 'unsafe-inline' 'unsafe-eval' 'strict-dynamic' https: http:" : ""} https://www.googletagmanager.com https://plausible.io${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self' https://*.supabase.co https://*.supabase.io wss://*.supabase.co https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://plausible.io https://*.plausible.io${adsenseHasSlots ? " https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com https://*.googleadservices.com" : ""}`,
    `frame-src 'self' https://www.youtube-nocookie.com${adsenseHasSlots ? " https://*.google.com https://*.doubleclick.net https://*.googlesyndication.com" : ""}`,
    `media-src 'self'${mediaOrigin ? ` ${mediaOrigin}` : ""}`,
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
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let decodedPath: string;
  try { decodedPath = decodeURIComponent(pathname); } catch { return new NextResponse(null, { status: 400 }); }
  if (/(?:^|\/)(?:\.env(?:\.[^/]*)?|\.git|\.svn|\.aws|\.codex|\.agents|node_modules|backups?)(?:\/|$)/i.test(decodedPath)
    || /^\/(?:backup[^/]*\.(?:zip|sql|gz|tar|bak)|package(?:-lock)?\.json|next\.config\.[^/]+)$/i.test(decodedPath)) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", policy);
  requestHeaders.set("x-nonce", nonce);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  if (/^\/(?:admin|api\/(?:admin|user|notifications)|auth)(?:\/|$)/.test(pathname)) {
    response.headers.set("Cache-Control", "private, no-store");
  }

  if (EMAIL_AUTH_PATHS.has(pathname) && process.env.EMAIL_AUTH_ENABLED === "false") {
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
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
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

  if (pathname !== "/admin/seguranca") {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !isVerifiedAdminSession(user, session.access_token)) {
      return secureRedirect(new URL("/admin/seguranca", request.url), policy);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)"],
};
