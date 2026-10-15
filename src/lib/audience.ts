export function audiencePath(path: string): string | null {
  if (path === "/profile/setup") return null;
  if (["/", "/noticias", "/noticias/arquivo", "/em-alta", "/lancamentos", "/brickboard", "/brickboard/ranking", "/brickboard/conquistas", "/brickboard/como-funciona", "/sobre", "/contato", "/termos", "/privacidade", "/busca", "/meu-brick"].includes(path)) return path;
  if (/^\/(posts|games|plataforma|institucional)\/[a-z0-9-]{1,180}$/.test(path)) return path;
  if (/^\/(u|profile)\/[^/]+$/.test(path)) return "/perfil";
  return null;
}
