import type { MetadataRoute } from "next";
import { cookies } from "next/headers";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let isInverted = false;
  try {
    const cookieStore = await cookies();
    isInverted = cookieStore.get("ob_app_icon")?.value === "inverted";
  } catch {
    isInverted = false;
  }

  const iconSuffix = isInverted ? "-inverted" : "";
  const v = "3";

  return {
    name: "Orange Brick",
    short_name: "Orange Brick",
    description: "Portal de notícias de games — rápido, direto e sem frescura.",
    start_url: "/",
    display: "standalone",
    background_color: isInverted ? "#0D0E12" : "#0D0E12",
    theme_color: isInverted ? "#FFFFFF" : "#FF5E00",
    orientation: "portrait",
    icons: [
      {
        src: `/icons/icon${iconSuffix}-192.png?v=${v}`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/icons/icon${iconSuffix}-512.png?v=${v}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/icons/icon-maskable${iconSuffix}-512.png?v=${v}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Últimas Notícias",
        short_name: "Notícias",
        description: "Confira as notícias mais recentes do mundo dos games",
        url: "/?utm_source=pwa_shortcut&utm_medium=shortcut",
        icons: [
          {
            src: `/icons/shortcuts/shortcut-news${iconSuffix}.png?v=${v}`,
            sizes: "96x96",
            type: "image/png",
          },
        ],
      },
      {
        name: "Mais Hypadas",
        short_name: "Em Alta",
        description: "Matérias mais curtidas e quentes do momento",
        url: "/?sort=hyped&utm_source=pwa_shortcut&utm_medium=shortcut",
        icons: [
          {
            src: `/icons/shortcuts/shortcut-hype${iconSuffix}.png?v=${v}`,
            sizes: "96x96",
            type: "image/png",
          },
        ],
      },
      {
        name: "Reels & Vídeos",
        short_name: "Reels",
        description: "Assista aos resumos em vídeo e reels",
        url: "/reels?utm_source=pwa_shortcut&utm_medium=shortcut",
        icons: [
          {
            src: `/icons/shortcuts/shortcut-reels${iconSuffix}.png?v=${v}`,
            sizes: "96x96",
            type: "image/png",
          },
        ],
      },
      {
        name: "Meu Brick",
        short_name: "Meu Brick",
        description: "Acesse seu perfil, matérias salvas e configurações",
        url: "/meu-brick?utm_source=pwa_shortcut&utm_medium=shortcut",
        icons: [
          {
            src: `/icons/shortcuts/shortcut-brick${iconSuffix}.png?v=${v}`,
            sizes: "96x96",
            type: "image/png",
          },
        ],
      },
    ],
  };
}
