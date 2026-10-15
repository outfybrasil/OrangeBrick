import { publicationImageBlockers, type ImagePublicationPost } from "./server/manual-publication-images.ts";

export type AttentionItem = { id: string; kind: "image" | "review" | "video" | "publication"; title: string; message: string; href: string; urgent: boolean };
export type AttentionPost = ImagePublicationPost & { is_published: boolean; updated_at: string };
export type AttentionReview = { id: string; post_id: string; status: string; expected_updated_at: string; finished_at?: string | null; report: { remaining?: string[] } | null };
export type AttentionVideo = { id: string; post_id: string; status: string };
export type AttentionPublication = { id: string; post_id: string; status: string };

export function buildAdminAttention(posts: AttentionPost[], reviews: AttentionReview[], videos: AttentionVideo[], publications: AttentionPublication[], checkedImages?: Map<string, string[]>): AttentionItem[] {
  const items: AttentionItem[] = [];
  const byId = new Map(posts.map(post => [post.id, post]));
  for (const post of posts) {
    const problems = [...new Set([...publicationImageBlockers(post), ...(checkedImages?.get(post.id) || [])])];
    if (problems.length) items.push({ id: `image:${post.id}`, kind: "image", title: post.title, message: problems.join(" "), href: `/admin/edit?id=${post.id}`, urgent: post.is_published });
  }
  const seen = new Set<string>();
  for (const job of reviews) {
    if (seen.has(`review:${job.post_id}`)) continue;
    seen.add(`review:${job.post_id}`);
    const post = byId.get(job.post_id);
    if (!post || post.is_published) continue;
    const changedAfterReview = job.finished_at
      ? Date.parse(post.updated_at) > Date.parse(job.finished_at)
      : Date.parse(post.updated_at) !== Date.parse(job.expected_updated_at);
    if (changedAfterReview) continue;
    const labels: Record<string, string> = { queued: "Revisão na fila.", running: "Revisão em andamento.", needs_review: "A revisão encontrou pendências.", failed: "A revisão automática falhou. Abra a matéria para conferir ou tentar novamente." };
    if (labels[job.status]) items.push({ id: `review:${post.id}`, kind: "review", title: post.title, message: [labels[job.status], ...(job.report?.remaining || [])].join(" "), href: `/admin/edit?id=${post.id}`, urgent: job.status === "failed" });
  }
  for (const [kind, jobs] of [["video", videos], ["publication", publications]] as const) {
    for (const job of jobs) {
      const key = `${kind}:${job.post_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const post = byId.get(job.post_id);
      if (!post) continue;
      const labels: Record<string, string> = kind === "video" ? { queued: "Vídeo na fila.", running: "Vídeo em processamento.", failed: "A geração do vídeo falhou. Confira os detalhes e tente novamente no painel de Reels." } : { preparing: "Envio ao YouTube em preparação.", uploading: "Envio ao YouTube em andamento.", failed: "O envio ao YouTube falhou. Confira os detalhes no painel de Reels.", unknown: "O resultado do envio ao YouTube precisa ser conferido antes de tentar novamente." };
      if (labels[job.status]) items.push({ id: key, kind, title: post.title, message: labels[job.status], href: "/admin/reels", urgent: ["failed", "unknown"].includes(job.status) });
    }
  }
  return items.sort((a, b) => Number(b.urgent) - Number(a.urgent));
}
