import { redirect } from "next/navigation";

interface LegacyProfilePageProps {
  params: Promise<{ nickname: string }>;
}

export default async function LegacyProfilePage({ params }: LegacyProfilePageProps) {
  const { nickname } = await params;
  redirect(`/u/${encodeURIComponent(nickname)}`);
}
