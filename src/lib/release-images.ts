export function validateReleaseImageUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Informe uma URL HTTPS válida.";
  }

  if (url.protocol !== "https:") return "A imagem precisa usar HTTPS.";

  return null;
}

export function validateReleaseSourceUrl(value: string) {
  const urlError = validateReleaseImageUrl(value);
  if (urlError) return urlError;

  const url = new URL(value);
  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname.toLowerCase();
  if (
    /^encrypted-tbn\d+\.gstatic\.com$/.test(hostname)
    || /^tse\d+\.mm\.bing\.net$/.test(hostname)
    || hostname === "th.bing.com"
  ) {
    return "Essa URL é uma miniatura do buscador. Abra o site de origem e importe a imagem original.";
  }
  if (pathname.endsWith("/header.jpg") || pathname.includes("capsule_616x353")) {
    return "Essa URL aponta para uma miniatura pequena. Use a arte promocional original.";
  }

  return null;
}

export function validateReleaseSourceDimensions(width: number, height: number) {
  if (width < 1200 || height < 675) {
    return `Imagem pequena: ${width} × ${height}. Use no mínimo 1200 × 675.`;
  }
  if (Math.abs(width / height - 16 / 9) > 0.12) {
    return `Proporção incompatível: ${width} × ${height}. Use uma arte horizontal 16:9.`;
  }
  return null;
}

export function releaseOutputDimensions(width: number, height: number) {
  const outputWidth = Math.floor(Math.min(1920, width, height * 16 / 9));
  return {
    width: outputWidth,
    height: Math.round(outputWidth * 9 / 16),
  };
}

export function isManagedReleaseImageUrl(value: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;
  try {
    const imageUrl = new URL(value);
    const projectUrl = new URL(supabaseUrl);
    return imageUrl.origin === projectUrl.origin
      && imageUrl.pathname.includes("/storage/v1/object/public/post-images/");
  } catch {
    return false;
  }
}

export function isAllowedReleaseImageUrl(value: string) {
  return validateReleaseImageUrl(value) === null;
}
