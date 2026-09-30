export function getReleaseTodayIso(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function isRetainedRelease(dateIso: string | null | undefined, todayIso = getReleaseTodayIso()): boolean {
  return !dateIso || dateIso >= `${todayIso.slice(0, 7)}-01`;
}

export function getReleaseMonth(dateIso: string | undefined): { key: string; label: string } {
  if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return { key: "other", label: "Data a confirmar" };
  const date = new Date(`${dateIso}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateIso) return { key: "other", label: "Data a confirmar" };
  const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return { key: dateIso.slice(0, 7), label: label.charAt(0).toUpperCase() + label.slice(1) };
}
