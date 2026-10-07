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

export function getReleaseWeek(dateIso: string | undefined): { key: string; label: string } {
  if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return { key: "other", label: "Data a confirmar" };
  const date = new Date(`${dateIso}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateIso) return { key: "other", label: "Data a confirmar" };

  const start = new Date(date);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);

  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  const startMonth = start.getUTCMonth();
  const endMonth = end.getUTCMonth();
  const startDay = new Intl.DateTimeFormat("pt-BR", { day: "numeric", timeZone: "UTC" }).format(start);
  const endDay = new Intl.DateTimeFormat("pt-BR", { day: "numeric", timeZone: "UTC" }).format(end);
  const startMonthName = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(start);
  const endMonthName = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(end);
  const key = start.toISOString().slice(0, 10);

  if (startYear === endYear && startMonth === endMonth) {
    return { key, label: `Semana de ${startDay} a ${endDay} de ${endMonthName} de ${endYear}` };
  }
  if (startYear === endYear) {
    return { key, label: `Semana de ${startDay} de ${startMonthName} a ${endDay} de ${endMonthName} de ${endYear}` };
  }
  return {
    key,
    label: `Semana de ${startDay} de ${startMonthName} de ${startYear} a ${endDay} de ${endMonthName} de ${endYear}`,
  };
}
