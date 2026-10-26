export type PushPlatform = "ios" | "android" | "desktop";

export type PushPermissionOutcome = "granted" | "denied" | "dismissed";

export function detectPlatform(userAgent: string, platform: string, maxTouchPoints: number): PushPlatform {
  if (/iphone|ipad|ipod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1)) return "ios";
  if (/android/i.test(userAgent)) return "android";
  return "desktop";
}

export function isInAppBrowser(userAgent: string) {
  return /(FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|Snapchat|Pinterest|LinkedInApp|WhatsApp|GSA\/|; wv\))/i.test(userAgent);
}

export function resolvePermissionOutcome(
  requested?: string | null,
  current?: string | null
): PushPermissionOutcome {
  if (current === "granted" || requested === "granted") return "granted";
  if (current === "denied" || requested === "denied") return "denied";
  return "dismissed";
}

export function permissionMessage(outcome: Exclude<PushPermissionOutcome, "granted">) {
  if (outcome === "denied") {
    return "Os alertas estão bloqueados para o Orange Brick neste navegador. Libere a permissão e toque em Receber alertas de novo.";
  }
  return "O navegador fechou o pedido de permissão antes de você confirmar. Toque em Tentar de novo e escolha Permitir na janela que aparecer.";
}

export function permissionSteps(platform: PushPlatform): string[] {
  if (platform === "ios") {
    return [
      "Abra Ajustes → Notificações → Orange Brick.",
      "Ative Permitir Notificações e volte ao app.",
      "Toque em Receber alertas novamente.",
    ];
  }
  if (platform === "android") {
    return [
      "Toque no cadeado ao lado do endereço do site.",
      "Abra Permissões → Notificações e escolha Permitir.",
      "Se a opção não aparecer, libere as notificações do navegador nos ajustes do Android.",
      "Recarregue a página e toque em Receber alertas novamente.",
    ];
  }
  return [
    "Clique no cadeado (ou no ícone de configurações) ao lado do endereço.",
    "Abra Notificações e escolha Permitir.",
    "Recarregue a página e toque em Receber alertas novamente.",
  ];
}
