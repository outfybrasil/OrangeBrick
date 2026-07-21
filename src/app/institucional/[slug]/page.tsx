import { InstitutionalClient } from "./InstitutionalClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface InstitutionalProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return [
    { slug: "termos" },
    { slug: "privacidade" },
    { slug: "anuncie" },
  ];
}

const pages = {
  termos: { title: "Termos de Uso", description: "Termos de uso do portal Orange Brick." },
  privacidade: { title: "Política de Privacidade", description: "Como o Orange Brick protege e trata dados pessoais." },
  anuncie: { title: "Anuncie", description: "Fale com a equipe comercial do Orange Brick." },
} as const;

export async function generateMetadata({ params }: InstitutionalProps): Promise<Metadata> {
  const { slug } = await params;
  const page = pages[slug as keyof typeof pages];
  return page ? { title: page.title, description: page.description } : {};
}

export default async function InstitutionalPage({ params }: InstitutionalProps) {
  const { slug } = await params;
  if (!(slug in pages)) notFound();
  return <InstitutionalClient slug={slug as keyof typeof pages} />;
}
