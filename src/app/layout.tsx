import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { Outfit, Space_Grotesk, Plus_Jakarta_Sans, JetBrains_Mono, Geist } from "next/font/google";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { ToastProvider } from "@/lib/contexts/ToastContext";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { GlobalSearchShortcut } from "@/components/ui/GlobalSearchShortcut";
import { CookieConsent } from "@/components/ui/CookieConsent";
import { AudienceTracker } from "@/components/ui/AudienceTracker";
import { Analytics } from "@/components/ui/Analytics";
import { getSiteUrl } from "@/lib/site-url";
import { MobileBottomNav } from "@/components/ui/MobileBottomNav";
import { AccessibilityMenu } from "@/components/ui/AccessibilityMenu";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { cn } from "@/lib/utils";
import Script from "next/script";
import { headers } from "next/headers";
import "./globals.css";

const headingFont = Outfit({
  subsets: ["latin"],
  variable: "--font-heading-var",
  display: "swap",
});

const subtitleFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-subtitle-var",
  display: "swap",
});

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body-var",
  display: "swap",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-var",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const viewport: Viewport = {
  themeColor: "#FF5E00",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Orange Brick — notícias de games, hardware e indústria",
    template: "%s | Orange Brick",
  },
  description: "Portal de notícias de games — rápido, direto e sem frescura.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/favicon-16x16.png?v=2", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png?v=2", sizes: "48x48", type: "image/png" },
      { url: "/favicon-64x64.png?v=2", sizes: "64x64", type: "image/png" },
      { url: "/icons/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=2",
    apple: [
      { url: "/icons/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Orange Brick — notícias de games, hardware e indústria",
  },
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
  openGraph: {
    title: "Orange Brick",
    description: "Portal de notícias de games — rápido, direto e sem frescura.",
    siteName: "Orange Brick",
    type: "website",
    locale: "pt_BR",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "Orange Brick Logo" }],
  },
  twitter: { card: "summary_large_image", title: "Orange Brick — notícias de games, hardware e indústria", description: "Notícias de games, hardware, indústria e modding." },
  verification: {
    google: ["1MwU6xe9hs6pdkfLkjZq-plADLtEYNW9IqCq0th5l74", "Wrom7GWTekisbRXoXMyr2ADfnHBD-Z1ljBevtvE0lBs"],
    other: {
      "tiktok-developers-site-verification": "wOZXVcnRMIfBR1xKYxVTtX1IS9hQr3qR",
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="pt-BR"
      className={cn("h-full", "antialiased", headingFont.variable, subtitleFont.variable, bodyFont.variable, monoFont.variable, geist.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-dvh flex flex-col bg-background-void text-white font-body">
        <Script
          id="orange-theme-init"
          strategy="beforeInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(()=>{try{const saved=localStorage.getItem("orange-theme");const theme=saved==="light"?"light":"dark";document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme}catch{document.documentElement.dataset.theme="dark";document.documentElement.style.colorScheme="dark"}})();`,
          }}
        />
        <a
          id="link-pular-conteudo"
          href="#conteudo-principal"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-brand-orange focus:px-4 focus:py-2 focus:text-xs focus:font-black focus:text-black focus:outline-2 focus:outline-offset-2"
        >
          Pular para o conteúdo
        </a>
        <script
          suppressHydrationWarning
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Orange Brick",
              alternateName: ["Orange Brick Portal", "Portal Orange Brick"],
              url: getSiteUrl(),
              potentialAction: {
                "@type": "SearchAction",
                target: `${getSiteUrl()}/busca?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }).replace(/</g, "\\u003c"),
          }}
        />
        <AuthProvider>
          <ToastProvider>
            {children}
            <ToastContainer />
            <GlobalSearchShortcut />
            <MobileBottomNav />
          </ToastProvider>
        </AuthProvider>
        <PwaInstallBanner />
        <AccessibilityMenu />
        <CookieConsent />
        <Analytics />
        <AudienceTracker />
      </body>
    </html>
  );
}
