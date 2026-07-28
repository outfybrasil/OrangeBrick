export function getCommunityErrorMessage(error: unknown): string {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : "";
  const normalized = message.toLocaleLowerCase("pt-BR");

  if (normalized.includes("limite diário")) return "Você atingiu o limite de hoje. Amanhã as ações serão liberadas novamente.";
  if (normalized.includes("suspensa até")) return message;
  if (normalized.includes("bloqueada pela moderação")) return "Sua participação no Brickboard está bloqueada. Você ainda pode acessar e ler o conteúdo.";
  if (normalized.includes("duplicate") || normalized.includes("unique")) return "Esta ação já foi registrada.";
  if (normalized.includes("row-level security") || normalized.includes("permission")) return "Sua sessão não permite esta ação. Entre novamente e tente outra vez.";
  if (normalized.includes("network") || normalized.includes("fetch")) return "A conexão falhou. Confira sua internet e tente novamente.";

  return "Não foi possível concluir a ação. Tente novamente em instantes.";
}
