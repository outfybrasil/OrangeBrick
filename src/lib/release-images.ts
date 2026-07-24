const BLOCKED_RELEASE_IMAGE_HOSTS = [
  "steamstatic.com",
  "steampowered.com",
  "akamaihd.net",
  "googleusercontent.com",
  "gstatic.com",
  "bing.com",
];

export function validateReleaseImageUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Informe uma URL HTTPS válida.";
  }

  if (url.protocol !== "https:") return "A imagem precisa usar HTTPS.";

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_RELEASE_IMAGE_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
    return "Use uma arte oficial em alta resolução ou uma imagem armazenada no Orange Brick. Steam e miniaturas de buscadores não são aceitas.";
  }

  return null;
}

export function isAllowedReleaseImageUrl(value: string) {
  return validateReleaseImageUrl(value) === null;
}
