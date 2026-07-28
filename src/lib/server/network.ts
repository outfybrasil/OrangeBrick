import { resolve4, resolve6 } from "node:dns/promises";
import { isIP } from "node:net";

function parseIpv4(address: string) {
  const match = address.match(/^(?:0*:)*ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const value = match?.[1] || address;
  if (isIP(value) !== 4) return null;
  return value.split(".").map(Number);
}

export function isRestrictedAddress(address: string) {
  const normalized = address.toLowerCase().split("%")[0];
  const ipv4 = parseIpv4(normalized);
  if (ipv4) {
    const [first, second, third] = ipv4;
    return first === 0
      || first === 10
      || first === 100 && second >= 64 && second <= 127
      || first === 127
      || first === 169 && second === 254
      || first === 172 && second >= 16 && second <= 31
      || first === 192 && second === 0 && third === 0
      || first === 192 && second === 0 && third === 2
      || first === 192 && second === 168
      || first === 198 && second >= 18 && second <= 19
      || first === 198 && second === 51 && third === 100
      || first === 203 && second === 0 && third === 113
      || first >= 224;
  }
  if (isIP(normalized) !== 6) return true;
  return normalized === "::"
    || normalized === "::1"
    || normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || normalized.startsWith("fe8")
    || normalized.startsWith("fe9")
    || normalized.startsWith("fea")
    || normalized.startsWith("feb")
    || normalized.startsWith("2001:db8:");
}

export async function validateRemoteUrl(value: string, httpsOnly = true) {
  const url = new URL(value);
  const protocols = httpsOnly ? ["https:"] : ["http:", "https:"];
  if (!protocols.includes(url.protocol) || url.username || url.password) {
    throw new Error(httpsOnly ? "Use uma URL HTTPS válida" : "Use uma URL HTTP ou HTTPS válida");
  }
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) {
    throw new Error("Endereço não permitido");
  }
  const addresses = isIP(url.hostname)
    ? [url.hostname]
    : [...await resolve4(url.hostname).catch(() => []), ...await resolve6(url.hostname).catch(() => [])];
  if (!addresses.length || addresses.some(isRestrictedAddress)) {
    throw new Error("Endereço não permitido");
  }
  return url;
}
