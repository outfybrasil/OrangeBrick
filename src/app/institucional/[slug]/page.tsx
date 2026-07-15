import { InstitutionalClient } from "./InstitutionalClient";

interface InstitutionalProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return [
    { slug: "anuncie" },
    { slug: "termos" },
    { slug: "privacidade" },
  ];
}

export default async function InstitutionalPage({ params }: InstitutionalProps) {
  const { slug } = await params;
  return <InstitutionalClient slug={slug} />;
}
