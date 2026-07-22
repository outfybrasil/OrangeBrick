import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Outfit, Space_Grotesk, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import PushSetup from "@/components/PushSetup";
import "./globals.css";

const headingFont = Outfit({
  subsets: ["latin"],
  variable: "--font-heading-var",
  display: "swap",
  weight: ["500", "600", "700", "800", "900"],
});

const subtitleFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-subtitle-var",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body-var",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-var",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "Orange Brick",
    template: "%s | Orange Brick",
  },
  description: "Portal de notícias de games — rápido, direto e sem frescura.",
  alternates: { canonical: "/", types: { "application/rss+xml": "/feed.xml" } },
  openGraph: {
    title: "Orange Brick",
    description: "Portal de notícias de games — rápido, direto e sem frescura.",
    siteName: "Orange Brick",
    type: "website",
    locale: "pt_BR",
    url: "/",
  },
  twitter: { card: "summary_large_image", title: "Orange Brick", description: "Notícias de games, hardware, indústria e modding." },
  verification: { google: "Wrom7GWTekisbRXoXMyr2ADfnHBD-Z1ljBevtvE0lBs" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${headingFont.variable} ${subtitleFont.variable} ${bodyFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="min-h-dvh flex flex-col bg-background-void text-white font-body">
        <AuthProvider>{children}</AuthProvider>
        <PushSetup />
      </body>
    </html>
  );
}
