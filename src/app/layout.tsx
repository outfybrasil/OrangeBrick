import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Fira_Code } from "next/font/google";
import { ConsoleEasterEgg } from "@/components/ConsoleEasterEgg";
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
  title: "Orange Brick",
  description: "Portal de notícias de games — rápido, direto e sem frescura.",
  openGraph: {
    title: "Orange Brick",
    description: "Portal de notícias de games — rápido, direto e sem frescura.",
    siteName: "Orange Brick",
    type: "website",
  },
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
        <ConsoleEasterEgg />
        {children}
      </body>
    </html>
  );
}
