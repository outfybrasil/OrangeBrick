import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
        "/auth",
        "/configuracoes",
        "/post",
        "/primeiros-passos",
        "/profile/setup",
        "/minha-orange",
        "/busca",
        "/entrar",
        "/cadastro",
        "/recuperar-senha",
        "/nova-senha",
        "/assuntos*",
        "/noticias?*",
        "/brickboard?*",
        "/en/brickboard?*",
      ],
    },
    sitemap: [`${siteUrl}/sitemap.xml`, `${siteUrl}/news-sitemap.xml`],
  };
}
