export function timeAgo(date: string | Date): string {
  if (!date) return "";
  const now = new Date();
  const then = new Date(date);
  if (isNaN(then.getTime())) return "";
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes} min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays < 7) return `há ${diffDays}d`;
  if (diffDays < 30) return `há ${Math.floor(diffDays / 7)}sem`;
  return then.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}
