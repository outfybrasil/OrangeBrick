import type { LongVideoManifestItem } from "./reel-service";

export type VideoVariant = "full" | "no_narration" | "clean" | "srt";
export type LibraryVideo = LongVideoManifestItem & {
  replaces_slug?: string;
  replaced_by_slug?: string;
  review_history?: { id: string; kind: string; at: string; detail: string; related_slug?: string }[];
  is_preview?: boolean;
  available_variants?: VideoVariant[];
  youtube: LongVideoManifestItem["youtube"] & { video_id?: string; video_url?: string; upload_status?: string };
};

export function mergeVideoManifests(...sources: Record<string, LibraryVideo>[]) {
  const merged: Record<string, LibraryVideo> = {};
  for (const source of sources) {
    for (const [slug, item] of Object.entries(source)) {
      if (!item || item.slug !== slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) continue;
      const previous = merged[slug];
      if (!previous || Date.parse(item.updated_at || item.created_at) >= Date.parse(previous.updated_at || previous.created_at)) merged[slug] = item;
    }
  }
  return merged;
}

export function videoArchiveSlugs(videos: LibraryVideo[]) {
  const replaced = new Set(videos.flatMap(video => video.replaces_slug ? [video.replaces_slug, `${video.replaces_slug}-oficial`] : []));
  return new Set(videos.filter(video => video.is_preview || video.slug.endsWith("-preview") || replaced.has(video.slug)).map(video => video.slug));
}

export function videoDelivery(video: LibraryVideo) {
  if (video.youtube.video_id) return video.youtube.scheduled_at && video.youtube.upload_status === "scheduled" ? "scheduled" : "uploaded";
  if (video.status === "scheduled") return "planned";
  return video.status;
}

export function videoDate(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Sem data definida";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function videoVersions(video: LibraryVideo, videos: LibraryVideo[]) {
  const bySlug = new Map(videos.map(item => [item.slug, item]));
  const root = (item: LibraryVideo) => {
    const seen = new Set<string>();
    while (item.replaces_slug && bySlug.has(item.replaces_slug) && !seen.has(item.slug)) {
      seen.add(item.slug);
      item = bySlug.get(item.replaces_slug)!;
    }
    return item.slug;
  };
  const slug = root(video);
  return videos.filter(item => root(item) === slug || item.slug === `${slug}-oficial`).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}
