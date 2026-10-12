export function assertEditorialReviewAudit(text: string, materials: Array<{ url: string; text: string }>): void {
  const value: unknown = JSON.parse(text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, ""));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("A checagem factual não retornou uma revisão válida.");
  const audit = value as Record<string, unknown>;
  if (audit.supported !== true || !Array.isArray(audit.issues) || audit.issues.length || !Array.isArray(audit.checks)) {
    const reasons = Array.isArray(audit.issues) ? audit.issues.filter((issue): issue is string => typeof issue === "string").slice(0, 3).map((issue) => issue.slice(0, 200)).join(" ") : "";
    throw new Error(`A checagem factual encontrou afirmações sem comprovação. ${reasons} O rascunho original foi mantido para revisão manual.`);
  }
  const sections = new Set(["title", "summary", "intro_text", "development_text", "conclusion_text"]);
  const normalize = (input: string) => input.normalize("NFKC").replace(/\s+/g, " ").trim();
  for (const check of audit.checks) {
    if (!check || typeof check !== "object" || Array.isArray(check)) throw new Error("Prova editorial inválida.");
    const item = check as Record<string, unknown>;
    if (typeof item.section !== "string" || typeof item.source_url !== "string" || typeof item.excerpt !== "string") throw new Error("Prova editorial incompleta.");
    const source = materials.find((material) => material.url === item.source_url);
    const excerpt = normalize(item.excerpt);
    if (!source || excerpt.length < 20 || excerpt.length > 500 || !normalize(source.text).includes(excerpt)) throw new Error("A prova citada pela IA não foi encontrada na fonte lida.");
    sections.delete(item.section);
  }
  if (sections.size) throw new Error("A checagem factual não cobriu todas as partes da matéria.");
}
