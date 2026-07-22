import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PLATFORMS_CONFIG, PLATFORM_SLUGS, PlatformSlug } from "@/lib/types/platform";
import { PlatformHubClient } from "./PlatformHubClient";

interface PlatformPageProps {
  params: Promise<{
    platform: string;
  }>;
}

export function generateStaticParams() {
  return PLATFORM_SLUGS.map((platform) => ({
    platform,
  }));
}

export async function generateMetadata({ params }: PlatformPageProps): Promise<Metadata> {
  const { platform } = await params;
  const slug = platform.toLowerCase() as PlatformSlug;
  const config = PLATFORMS_CONFIG[slug];

  if (!config) {
    return {
      title: "Plataforma Não Encontrada | Orange Brick",
    };
  }

  return {
    title: `Notícias e Lançamentos ${config.name}`,
    description: config.description,
    openGraph: {
      title: `${config.name} | Orange Brick`,
      description: config.description,
    },
  };
}

export default async function PlatformPage({ params }: PlatformPageProps) {
  const { platform } = await params;
  const slug = platform.toLowerCase() as PlatformSlug;
  const config = PLATFORMS_CONFIG[slug];

  if (!config) {
    notFound();
  }

  return <PlatformHubClient config={config} />;
}
