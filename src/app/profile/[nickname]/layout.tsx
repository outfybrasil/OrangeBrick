import type { Metadata } from "next";
import type { ReactNode } from "react";

interface ProfileLayoutProps {
  children: ReactNode;
  params: Promise<{ nickname: string }>;
}

export async function generateMetadata({ params }: ProfileLayoutProps): Promise<Metadata> {
  const { nickname } = await params;
  const canonical = `/profile/${encodeURIComponent(nickname)}`;

  return {
    title: "Perfil de jogador",
    alternates: { canonical },
    openGraph: { type: "profile", url: canonical },
  };
}

export default function ProfileLayout({ children }: Pick<ProfileLayoutProps, "children">) {
  return children;
}
