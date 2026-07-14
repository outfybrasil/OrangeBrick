import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 1. Inicializar cliente Supabase no Middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 2. Recuperar usuário da sessão atual
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 3. Proteger rotas administrativas (/admin, /admin/edit, etc)
  if (pathname.startsWith("/admin")) {
    // Ignorar a rota de login para permitir a entrada
    if (pathname === "/admin/login") {
      // Se já está logado como admin e tenta ir no login, redireciona para o dashboard
      const adminEmail = process.env.ADMIN_EMAIL || "admin@orangebrick.com";
      if (user && user.email === adminEmail) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return response;
    }

    const adminEmail = process.env.ADMIN_EMAIL || "admin@orangebrick.com";
    
    // Se não está logado ou se o e-mail não for o e-mail cadastrado como admin
    if (!user || user.email !== adminEmail) {
      // Segurança por Obscuridade: Reescreve a requisição para uma rota inválida de forma
      // que o Next.js renderize o componente 404 (not-found) sem mudar a URL no navegador.
      // Desta forma, o invasor pensa que a URL /admin não existe.
      return NextResponse.rewrite(new URL("/not-found-route-obscurity-active", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Mapear todos os caminhos que começam com /admin
     */
    "/admin/:path*",
  ],
};
