import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Fira_Code } from "next/font/google";
import PushSetup from "@/components/PushSetup";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${firaCode.variable} h-full antialiased`}
    >
      <body className="min-h-dvh flex flex-col bg-background-void text-white font-sans">
        {children}
        <PushSetup />
      </body>
    </html>
  );
}
